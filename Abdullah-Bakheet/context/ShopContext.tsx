"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    loginApi,
    registerApi,
    fetchMeApi,
    fetchCartApi,
    mergeCartApi,
    addToCartApi,
    updateCartItemApi,
    removeCartItemApi,
    clearCartApi,
    fetchWishlistApi,
    toggleWishlistApi,
    mergeWishlistApi,
    removeWishlistItemApi,
    fetchShippingMethodsApi,
    fetchProductsApi,
} from '@/lib/api';

export interface PriceTier {
    minQty: number;
    maxQty?: number;
    price: number;
}

export interface CartItem {
    id: string; // Product/Variant ID
    itemId?: string;
    variantId?: string;
    productId?: string;
    sku?: string;
    name: string;
    category: string;
    price: number; // Active unit price
    catalogPrice?: number; // Standard retail base price
    corporatePrice?: number | null;
    tieredPricing?: PriceTier[];
    savings?: number;
    quantity: number;
    image: string;
    moq?: number;
    moqStep?: number;
    specifications?: Record<string, any>;
}

export interface WishlistItem {
    id: string;
    name: string;
    category?: string;
    price: number;
    image: string;
}

export interface ShippingMethodItem {
    id: string;
    name: string;
    arabicName?: string;
    description?: string;
    arabicDescription?: string;
    estimatedDays: string;
    arabicEstimatedDays?: string;
    isActive: boolean;
    rates: Record<string, number>;
    currentRate?: number;
    currentCurrency?: string;
}

export interface UserProfile {
    id?: string;
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyName?: string;
    companyTaxId?: string;
    crNumber?: string;
    customerGroup?: 'retail' | 'wholesale' | 'corporate';
    creditLimit?: number;
    availableCredit?: number;
    paymentTerms?: string;
    accountDiscountPercent?: number;
}

export const CURRENCY_RATES: Record<string, { rate: number; symbol: string; code: string }> = {
    'AED': { rate: 1.0, symbol: 'AED', code: 'AED' },
    'SAR': { rate: 1.02, symbol: 'SAR', code: 'SAR' },
    'USD': { rate: 0.272, symbol: '$', code: 'USD' },
    'EUR': { rate: 0.25, symbol: '€', code: 'EUR' },
    'INR': { rate: 22.7, symbol: '₹', code: 'INR' },
    'GBP': { rate: 0.21, symbol: '£', code: 'GBP' },
    'ر.س': { rate: 1.02, symbol: 'ر.س', code: 'SAR' },
    'د.إ': { rate: 1.0, symbol: 'AED', code: 'AED' },
};

interface ShopContextType {
    // Cart State
    cart: CartItem[];
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
    removeFromCart: (id: string) => void;
    updateQuantity: (id: string, delta: number) => void;
    setQuantity: (id: string, qty: number) => void;
    clearCart: () => void;
    cartTotal: number;
    cartSavings: number;
    cartCount: number;
    isCorporateUser: boolean;

    // Shipping State
    shippingMethods: ShippingMethodItem[];
    selectedShippingMethodId: string;
    setSelectedShippingMethodId: (id: string) => void;
    selectedShippingMethod: ShippingMethodItem | null;
    shippingCost: number;
    shippingFormatted: string;

    // Wishlist State
    wishlist: WishlistItem[];
    isWishlistOpen: boolean;
    setIsWishlistOpen: (open: boolean) => void;
    toggleWishlist: (item: WishlistItem) => Promise<boolean>;
    isInWishlist: (id: string) => boolean;
    wishlistCount: number;

    // Search Modal
    isSearchOpen: boolean;
    setIsSearchOpen: (open: boolean) => void;

    // User Account Modal & Auth
    isAccountOpen: boolean;
    setIsAccountOpen: (open: boolean) => void;
    user: UserProfile | null;
    isAuthLoading: boolean;
    accessToken: string | null;
    guestSessionId: string;
    setUser: (user: UserProfile | null) => void;
    login: (email: string, password?: string, phone?: string) => Promise<any>;
    register: (payload: { 
        email: string; 
        password?: string; 
        firstName?: string; 
        lastName?: string; 
        phone?: string;
        companyName?: string;
        companyTaxId?: string;
        crNumber?: string;
        customerGroup?: 'retail' | 'corporate' | 'wholesale';
    }) => Promise<any>;
    logout: () => void;

    // Preference state & Currency conversion
    language: string;
    setLanguage: (lang: string) => void;
    currency: string;
    setCurrency: (curr: string) => void;
    getConvertedPrice: (basePriceAED: number) => number;
    formatPrice: (basePriceAED: number) => string;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

function getOrCreateGuestSessionId(): string {
    if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';
    let session = localStorage.getItem('guest_session_id');
    if (!session || !/^[0-9a-fA-F-]{36}$/.test(session)) {
        session = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
            (Number(c) ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> Number(c) / 4).toString(16)
        );
        localStorage.setItem('guest_session_id', session);
    }
    return session;
}

const LOCAL_STORAGE_CART_KEY = 'abdullah_bakheet_cart_v2';
const LOCAL_STORAGE_WISHLIST_KEY = 'abdullah_bakheet_wishlist_v2';

const isMatchingCartItem = (a: any, b: any) => {
    if (!a || !b) return false;
    if (a.id && b.id && a.id === b.id) return true;
    if (a.productId && b.productId && a.productId === b.productId) return true;
    if (a.productId && b.id && a.productId === b.id) return true;
    if (a.id && b.productId && a.id === b.productId) return true;
    if (a.itemId && b.itemId && a.itemId === b.itemId) return true;
    if (a.itemId && b.id && a.itemId === b.id) return true;
    if (a.id && b.itemId && a.id === b.itemId) return true;
    if (a.variantId && b.variantId && a.variantId === b.variantId) return true;
    if (a.name && b.name && a.name.trim().toLowerCase() === b.name.trim().toLowerCase()) return true;
    return false;
};

const consolidateCartList = (items: CartItem[]): CartItem[] => {
    const result: CartItem[] = [];
    for (const item of items) {
        const idx = result.findIndex(c => isMatchingCartItem(c, item));
        if (idx > -1) {
            const combinedQty = (result[idx].quantity || 0) + (item.quantity || 1);
            const catalogBase = Number(result[idx].catalogPrice ?? item.catalogPrice ?? result[idx].price ?? item.price ?? 0);
            result[idx] = {
                ...result[idx],
                ...item,
                catalogPrice: catalogBase,
                quantity: combinedQty,
            };
        } else {
            result.push({
                ...item,
                catalogPrice: Number(item.catalogPrice ?? item.price ?? 0),
            });
        }
    }
    return result;
};

export function ShopProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);

    const [user, setUser] = useState<UserProfile | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [guestSessionId, setGuestSessionId] = useState<string>(() => getOrCreateGuestSessionId());

    const [language, setLanguage] = useState('English');
    const [currency, setCurrency] = useState('AED');
    const [shippingMethods, setShippingMethods] = useState<ShippingMethodItem[]>([]);
    const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string>('standard');

    // Fetch active shipping methods from backend
    useEffect(() => {
        let isMounted = true;
        fetchShippingMethodsApi(currency).then(methods => {
            if (isMounted && Array.isArray(methods) && methods.length > 0) {
                setShippingMethods(methods);
            }
        }).catch(err => console.warn('Failed to load shipping methods:', err));
        return () => { isMounted = false; };
    }, [currency]);

    // Synchronize & Merge Cart + Wishlist upon login or restore
    const syncWithBackendOnAuth = useCallback(async (token: string, localCartSnapshot: CartItem[], localWishlistSnapshot: WishlistItem[]) => {
        try {
            // 1. Merge cart with backend DB
            if (localCartSnapshot.length > 0) {
                const mergedCart = await mergeCartApi(localCartSnapshot, token);
                if (mergedCart?.items) {
                    const consolidated = consolidateCartList(mergedCart.items);
                    setCart(consolidated);
                    localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(consolidated));
                }
            } else {
                const remoteCart = await fetchCartApi(token);
                if (remoteCart?.items) {
                    const consolidated = consolidateCartList(remoteCart.items);
                    setCart(consolidated);
                    localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(consolidated));
                }
            }

            // 2. Merge wishlist with backend DB
            if (localWishlistSnapshot.length > 0) {
                const productIds = localWishlistSnapshot.map(i => i.id);
                const mergedWishlist = await mergeWishlistApi(productIds, token);
                if (mergedWishlist?.items) {
                    setWishlist(mergedWishlist.items);
                    localStorage.setItem(LOCAL_STORAGE_WISHLIST_KEY, JSON.stringify(mergedWishlist.items));
                }
            } else {
                const remoteWishlist = await fetchWishlistApi(token);
                if (remoteWishlist?.items) {
                    setWishlist(remoteWishlist.items);
                    localStorage.setItem(LOCAL_STORAGE_WISHLIST_KEY, JSON.stringify(remoteWishlist.items));
                }
            }
        } catch (err) {
            console.error('Failed to sync state with backend:', err);
        }
    }, []);

    // 1. Restore local cart, wishlist, and token on mount
    useEffect(() => {
        setIsMounted(true);
        const sid = getOrCreateGuestSessionId();
        setGuestSessionId(sid);

        let initialCart: CartItem[] = [];
        let initialWishlist: WishlistItem[] = [];

        try {
            const savedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                if (Array.isArray(parsed)) {
                    const normalized = parsed.map(item => ({
                        ...item,
                        price: Number(item.price || 0),
                    }));
                    const consolidated = consolidateCartList(normalized);
                    initialCart = consolidated;
                    setCart(consolidated);
                }
            }

            const savedWishlist = localStorage.getItem(LOCAL_STORAGE_WISHLIST_KEY);
            if (savedWishlist) {
                const parsed = JSON.parse(savedWishlist);
                if (Array.isArray(parsed)) {
                    const normalized = parsed.map(item => ({
                        ...item,
                        price: Number(item.price || 0),
                    }));
                    initialWishlist = normalized;
                    setWishlist(normalized);
                }
            }
        } catch (e) {
            console.error('Failed to load local storage state:', e);
        }

        const savedToken = localStorage.getItem('auth_access_token');
        if (savedToken) {
            setAccessToken(savedToken);
            fetchMeApi(savedToken).then(profile => {
                if (profile) {
                    const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email;
                    setUser({
                        id: profile.id,
                        name: fullName,
                        email: profile.email,
                        firstName: profile.firstName,
                        lastName: profile.lastName,
                        phone: profile.phone,
                        companyName: profile.companyName,
                        companyTaxId: profile.companyTaxId,
                        crNumber: profile.crNumber,
                        customerGroup: profile.customerGroup || 'retail',
                        creditLimit: profile.creditLimit ? Number(profile.creditLimit) : 0,
                        availableCredit: profile.availableCredit ? Number(profile.availableCredit) : 0,
                        paymentTerms: profile.paymentTerms || 'prepaid',
                        accountDiscountPercent: profile.accountDiscountPercent ? Number(profile.accountDiscountPercent) : 0,
                    });
                    // Trigger DB sync for authenticated user
                    syncWithBackendOnAuth(savedToken, initialCart, initialWishlist);
                } else {
                    localStorage.removeItem('auth_access_token');
                    setAccessToken(null);
                    setUser(null);
                }
            }).catch(() => {
                localStorage.removeItem('auth_access_token');
                setAccessToken(null);
                setUser(null);
            }).finally(() => {
                setIsAuthLoading(false);
            });
        } else {
            setIsAuthLoading(false);
        }
    }, [syncWithBackendOnAuth]);

    // 2. Persist cart to localStorage whenever it changes
    useEffect(() => {
        if (!isMounted) return;
        try {
            localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cart));
        } catch (e) {
            console.error('Failed to save cart to localStorage:', e);
        }
    }, [cart, isMounted]);

    const [catalogProducts, setCatalogProducts] = useState<any[]>([]);

    // Fetch catalog products once on mount / currency change for robust pricing resolution
    useEffect(() => {
        let isMounted = true;
        fetchProductsApi({ limit: 100, currency }).then(res => {
            if (isMounted && res?.items) {
                setCatalogProducts(res.items);
            }
        }).catch(err => console.warn('Failed to load catalog products in ShopContext:', err));
        return () => { isMounted = false; };
    }, [currency]);

    // 2b. Auto-enrich cart items with live tiered pricing & corporate price from catalog
    useEffect(() => {
        if (!isMounted || cart.length === 0 || catalogProducts.length === 0) return;

        setCart(prev => {
            let hasChanges = false;
            const updated = prev.map(cItem => {
                const match = catalogProducts.find(p => 
                    p.id === cItem.id || 
                    p.id === cItem.productId || 
                    p.slug === cItem.id ||
                    p.title?.trim().toLowerCase() === cItem.name?.trim().toLowerCase() ||
                    (p.title && cItem.name && cItem.name.toLowerCase().includes(p.title.toLowerCase()))
                );
                if (match) {
                    const catalogPrice = Number(match.price || cItem.catalogPrice || cItem.price);
                    const tieredPricing = match.tieredPricing || [];
                    const corporatePrice = match.corporatePrice || null;
                    const dynamicPrice = resolveItemPrice({
                        ...cItem,
                        catalogPrice,
                        tieredPricing,
                        corporatePrice,
                    }, cItem.quantity);

                    if (dynamicPrice !== cItem.price || cItem.catalogPrice !== catalogPrice || !cItem.tieredPricing || cItem.tieredPricing.length === 0) {
                        hasChanges = true;
                        return {
                            ...cItem,
                            catalogPrice,
                            tieredPricing,
                            corporatePrice,
                            price: dynamicPrice,
                        };
                    }
                }
                return cItem;
            });
            return hasChanges ? updated : prev;
        });
    }, [isMounted, cart.length, catalogProducts, currency]);

    // 3. Persist wishlist to localStorage
    useEffect(() => {
        if (!isMounted) return;
        try {
            localStorage.setItem(LOCAL_STORAGE_WISHLIST_KEY, JSON.stringify(wishlist));
        } catch (e) {
            console.error('Failed to save wishlist to localStorage:', e);
        }
    }, [wishlist, isMounted]);

    // Currency helper functions
    const getConvertedPrice = (price: number): number => {
        const normCurrency = (currency || 'AED').toUpperCase();
        const rateInfo = CURRENCY_RATES[normCurrency] || CURRENCY_RATES['AED'];
        const rate = rateInfo ? rateInfo.rate : 1.0;
        return Number(price || 0) * rate;
    };

    const formatPrice = (price: number): string => {
        const isArabic = language.startsWith('Arabic') || language === 'ar' || language === 'العربية';
        const normCurrency = (currency || 'AED').toUpperCase();
        const rateInfo = CURRENCY_RATES[normCurrency] || CURRENCY_RATES['AED'];
        const rate = rateInfo ? rateInfo.rate : 1.0;
        const converted = Number(price || 0) * rate;

        let symbol = currency;
        if (currency === 'SAR' || currency === 'ر.س') symbol = isArabic ? 'ر.س' : 'SAR';
        else if (currency === 'AED' || currency === 'د.إ') symbol = isArabic ? 'د.إ' : 'AED';
        else if (currency === 'USD') symbol = '$';
        else if (currency === 'EUR') symbol = '€';
        else if (currency === 'INR') symbol = '₹';
        else if (currency === 'GBP') symbol = '£';

        return `${symbol} ${converted.toFixed(2)}`;
    };

    const isCorporateUser = Boolean(user && (user.customerGroup === 'corporate' || user.customerGroup === 'wholesale'));

    // Dynamic resolution helper for an item given quantity and user tier
    const resolveItemPrice = (item: CartItem, qty: number): number => {
        let tiers = item.tieredPricing;
        let corpPrice = item.corporatePrice;
        let catalogBase = item.catalogPrice;

        // Fallback to catalogProducts lookup if item missing tier data
        if ((!tiers || tiers.length === 0) && catalogProducts.length > 0) {
            const match = catalogProducts.find(p => 
                p.id === item.id || 
                p.id === item.productId || 
                p.slug === item.id ||
                p.title?.trim().toLowerCase() === item.name?.trim().toLowerCase()
            );
            if (match) {
                tiers = match.tieredPricing;
                corpPrice = match.corporatePrice;
                catalogBase = Number(match.price || catalogBase);
            }
        }

        const catalogPrice = Number(catalogBase ?? item.catalogPrice ?? item.price ?? 0);
        let candidate = catalogPrice;

        if (isCorporateUser && corpPrice && Number(corpPrice) > 0) {
            candidate = Number(corpPrice);
        }

        if (Array.isArray(tiers) && tiers.length > 0) {
            const matchTier = tiers.find(t => {
                const min = Number(t.minQty || 1);
                const max = t.maxQty !== undefined && t.maxQty !== null && !isNaN(Number(t.maxQty)) ? Number(t.maxQty) : Infinity;
                return qty >= min && qty <= max;
            });
            if (matchTier && matchTier.price) {
                candidate = Math.min(candidate, Number(matchTier.price));
            }
        }

        if (user && Number(user.accountDiscountPercent) > 0) {
            const frac = Number(user.accountDiscountPercent) / 100;
            candidate = Number((candidate * (1 - frac)).toFixed(2));
        }

        return Number(candidate || catalogPrice);
    };

    const addToCart = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        const minMoq = Math.max(1, item.moq || 1);
        const addQty = item.quantity && item.quantity >= minMoq ? item.quantity : minMoq;
        const catalogBase = Number(item.catalogPrice || item.price || 0);

        setCart(prev => {
            const existingIndex = prev.findIndex(i => isMatchingCartItem(i, item));
            if (existingIndex > -1) {
                const updated = [...prev];
                const existing = updated[existingIndex];
                const newQty = existing.quantity + addQty;
                const newPrice = resolveItemPrice({ ...existing, ...item, catalogPrice: catalogBase }, newQty);
                updated[existingIndex] = {
                    ...existing,
                    ...item,
                    catalogPrice: catalogBase,
                    price: newPrice,
                    quantity: newQty,
                    moq: item.moq || existing.moq || 1,
                };
                return updated;
            }
            const unitPrice = resolveItemPrice({ ...item, catalogPrice: catalogBase, quantity: addQty } as CartItem, addQty);
            return [...prev, {
                ...item,
                catalogPrice: catalogBase,
                price: unitPrice,
                quantity: addQty,
                moq: minMoq,
                moqStep: item.moqStep || 1,
            }];
        });
        setIsCartOpen(true);

        // Async sync with DB if authenticated
        if (accessToken) {
            addToCartApi({
                productId: item.id,
                variantId: item.variantId,
                quantity: addQty,
                name: item.name,
                image: item.image,
                price: catalogBase,
                moq: item.moq,
                moqStep: item.moqStep,
                category: item.category,
                specifications: item.specifications,
            }, accessToken).catch(err => console.error('Background addToCartApi failed:', err));
        }
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => !isMatchingCartItem(i, { id, itemId: id, productId: id })));

        if (accessToken) {
            removeCartItemApi(id, accessToken).catch(err => console.error('Background removeCartItemApi failed:', err));
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        let finalQty = 0;
        setCart(prev =>
            prev.map(item => {
                if (isMatchingCartItem(item, { id, itemId: id, productId: id })) {
                    const minMoq = Math.max(1, item.moq || 1);
                    const step = Math.max(1, item.moqStep || 1);
                    const proposedQty = item.quantity + (delta * step);
                    if (proposedQty < minMoq) return item; // Cannot drop below MOQ
                    finalQty = proposedQty;

                    let catalogBase = Number(item.catalogPrice || 0);
                    let tiers = item.tieredPricing;
                    let corpPrice = item.corporatePrice;
                    if ((!catalogBase || !tiers || tiers.length === 0) && catalogProducts.length > 0) {
                        const match = catalogProducts.find(p => 
                            p.id === item.id || 
                            p.id === item.productId || 
                            p.slug === item.id || 
                            p.title?.trim().toLowerCase() === item.name?.trim().toLowerCase()
                        );
                        if (match) {
                            catalogBase = Number(match.price || catalogBase);
                            tiers = match.tieredPricing;
                            corpPrice = match.corporatePrice;
                        }
                    }
                    if (!catalogBase) catalogBase = Number(item.price || 0);

                    const dynamicPrice = resolveItemPrice({ 
                        ...item, 
                        catalogPrice: catalogBase, 
                        tieredPricing: tiers, 
                        corporatePrice: corpPrice 
                    }, proposedQty);

                    return { 
                        ...item, 
                        catalogPrice: catalogBase,
                        tieredPricing: tiers,
                        corporatePrice: corpPrice,
                        price: dynamicPrice, 
                        quantity: proposedQty 
                    };
                }
                return item;
            })
        );

        if (accessToken && finalQty > 0) {
            updateCartItemApi(id, finalQty, accessToken).catch(err => console.error('Background updateCartItemApi failed:', err));
        }
    };

    const setQuantity = (id: string, newQty: number) => {
        let finalQty = 0;
        setCart(prev =>
            prev.map(item => {
                if (isMatchingCartItem(item, { id, itemId: id, productId: id })) {
                    const minMoq = Math.max(1, item.moq || 1);
                    const safeQty = isNaN(newQty) || newQty < minMoq ? minMoq : Math.floor(newQty);
                    finalQty = safeQty;

                    let catalogBase = Number(item.catalogPrice || 0);
                    let tiers = item.tieredPricing;
                    let corpPrice = item.corporatePrice;
                    if ((!catalogBase || !tiers || tiers.length === 0) && catalogProducts.length > 0) {
                        const match = catalogProducts.find(p => 
                            p.id === item.id || 
                            p.id === item.productId || 
                            p.slug === item.id || 
                            p.title?.trim().toLowerCase() === item.name?.trim().toLowerCase()
                        );
                        if (match) {
                            catalogBase = Number(match.price || catalogBase);
                            tiers = match.tieredPricing;
                            corpPrice = match.corporatePrice;
                        }
                    }
                    if (!catalogBase) catalogBase = Number(item.price || 0);

                    const dynamicPrice = resolveItemPrice({ 
                        ...item, 
                        catalogPrice: catalogBase, 
                        tieredPricing: tiers, 
                        corporatePrice: corpPrice 
                    }, safeQty);

                    return { 
                        ...item, 
                        catalogPrice: catalogBase,
                        tieredPricing: tiers,
                        corporatePrice: corpPrice,
                        price: dynamicPrice, 
                        quantity: safeQty 
                    };
                }
                return item;
            })
        );

        if (accessToken && finalQty > 0) {
            updateCartItemApi(id, finalQty, accessToken).catch(err => console.error('Background updateCartItemApi failed:', err));
        }
    };

    const clearCart = () => {
        setCart([]);
        try {
            localStorage.removeItem(LOCAL_STORAGE_CART_KEY);
        } catch (e) {
            console.error('Failed to clear cart storage:', e);
        }

        if (accessToken) {
            clearCartApi(accessToken).catch(err => console.error('Background clearCartApi failed:', err));
        }
    };

    const toggleWishlist = async (item: WishlistItem): Promise<boolean> => {
        const normalizedItem: WishlistItem = {
            ...item,
            price: Number(item.price || 0),
        };
        const exists = wishlist.some(i => i.id === item.id);
        if (exists) {
            setWishlist(prev => prev.filter(i => i.id !== item.id));
            if (accessToken) {
                try {
                    await removeWishlistItemApi(item.id, accessToken);
                } catch (e) {
                    console.error('Failed to remove from backend wishlist:', e);
                }
            }
            return false;
        } else {
            setWishlist(prev => [...prev, normalizedItem]);
            if (accessToken) {
                try {
                    await toggleWishlistApi(item.id, accessToken);
                } catch (e) {
                    console.error('Failed to add to backend wishlist:', e);
                }
            }
            return true;
        }
    };

    const isInWishlist = (id: string) => wishlist.some(i => i.id === id);

    const login = async (email: string, password?: string, phone?: string) => {
        const data = await loginApi({ email, password, phone, guestSessionId });
        if (data?.accessToken) {
            setAccessToken(data.accessToken);
            localStorage.setItem('auth_access_token', data.accessToken);
        }
        if (data?.customer) {
            const c = data.customer;
            const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
            setUser({
                id: c.id,
                name: fullName,
                email: c.email,
                firstName: c.firstName,
                lastName: c.lastName,
                phone: c.phone,
                companyName: c.companyName,
                companyTaxId: c.companyTaxId,
                crNumber: c.crNumber,
                customerGroup: c.customerGroup || 'retail',
                creditLimit: c.creditLimit ? Number(c.creditLimit) : 0,
                availableCredit: c.availableCredit ? Number(c.availableCredit) : 0,
                paymentTerms: c.paymentTerms || 'prepaid',
                accountDiscountPercent: c.accountDiscountPercent ? Number(c.accountDiscountPercent) : 0,
            });

            // Perform automatic Cart & Wishlist merge with backend upon login
            if (data.accessToken) {
                await syncWithBackendOnAuth(data.accessToken, cart, wishlist);
            }
        }
        return data;
    };

    const register = async (payload: { 
        email: string; 
        password?: string; 
        firstName?: string; 
        lastName?: string; 
        phone?: string; 
        companyName?: string;
        companyTaxId?: string;
        crNumber?: string;
        customerGroup?: 'retail' | 'corporate' | 'wholesale';
    }) => {
        const data = await registerApi(payload);
        if (data?.accessToken) {
            setAccessToken(data.accessToken);
            localStorage.setItem('auth_access_token', data.accessToken);
        }
        if (data?.customer) {
            const c = data.customer;
            const fullName = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.email;
            setUser({
                id: c.id,
                name: fullName,
                email: c.email,
                firstName: c.firstName,
                lastName: c.lastName,
                phone: c.phone,
                companyName: c.companyName,
                companyTaxId: c.companyTaxId,
                crNumber: c.crNumber,
                customerGroup: c.customerGroup || 'retail',
                creditLimit: c.creditLimit ? Number(c.creditLimit) : 0,
                availableCredit: c.availableCredit ? Number(c.availableCredit) : 0,
                paymentTerms: c.paymentTerms || 'prepaid',
                accountDiscountPercent: c.accountDiscountPercent ? Number(c.accountDiscountPercent) : 0,
            });

            if (data.accessToken) {
                await syncWithBackendOnAuth(data.accessToken, cart, wishlist);
            }
        }
        return data;
    };

    const logout = () => {
        setUser(null);
        setAccessToken(null);
        localStorage.removeItem('auth_access_token');
        clearCart();
    };

    // Calculate cart totals (Base AED)
    const cartTotal = cart.reduce((sum, item) => {
        const p = resolveItemPrice(item, item.quantity || 1);
        return sum + (p * (item.quantity || 1));
    }, 0);

    const cartSavings = cart.reduce((sum, item) => {
        const catalog = Number(item.catalogPrice || item.price || 0);
        const resolved = resolveItemPrice(item, item.quantity || 1);
        const diff = Math.max(0, catalog - resolved);
        return sum + (diff * (item.quantity || 1));
    }, 0);

    const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const wishlistCount = wishlist.length;

    // Calculate active shipping method & cost for current currency directly from DB
    const selectedShippingMethod: ShippingMethodItem | null = 
        shippingMethods.find(m => m.id === selectedShippingMethodId && m.isActive) ||
        shippingMethods.find(m => m.isActive) ||
        shippingMethods[0] ||
        null;

    const normCurrency = (currency || 'AED').toUpperCase();
    const rawMethodRate = selectedShippingMethod?.rates?.[normCurrency] !== undefined
        ? selectedShippingMethod.rates[normCurrency]
        : (selectedShippingMethod?.rates?.['AED'] !== undefined ? selectedShippingMethod.rates['AED'] : 0);

    const shippingCost = Number(rawMethodRate);
    const rateInfo = CURRENCY_RATES[normCurrency] || CURRENCY_RATES['AED'];
    const shippingFormatted = `${rateInfo.symbol} ${shippingCost.toFixed(2)}`;

    return (
        <ShopContext.Provider
            value={{
                cart,
                isCartOpen,
                setIsCartOpen,
                addToCart,
                removeFromCart,
                updateQuantity,
                setQuantity,
                clearCart,
                cartTotal,
                cartSavings,
                cartCount,
                isCorporateUser,
                shippingMethods,
                selectedShippingMethodId,
                setSelectedShippingMethodId,
                selectedShippingMethod,
                shippingCost,
                shippingFormatted,
                wishlist,
                isWishlistOpen,
                setIsWishlistOpen,
                toggleWishlist,
                isInWishlist,
                wishlistCount,
                isSearchOpen,
                setIsSearchOpen,
                isAccountOpen,
                setIsAccountOpen,
                user,
                isAuthLoading,
                accessToken,
                guestSessionId,
                setUser,
                login,
                register,
                logout,
                language,
                setLanguage,
                currency,
                setCurrency,
                getConvertedPrice,
                formatPrice,
            }}
        >
            {children}
        </ShopContext.Provider>
    );
}

export function useShop() {
    const context = useContext(ShopContext);
    if (!context) {
        throw new Error('useShop must be used within a ShopProvider');
    }
    return context;
}
