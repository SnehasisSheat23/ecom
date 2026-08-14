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
} from '@/lib/api';

export interface CartItem {
    id: string; // Product/Variant ID
    itemId?: string;
    variantId?: string;
    productId?: string;
    sku?: string;
    name: string;
    category: string;
    price: number; // Base price in AED
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

interface UserProfile {
    id?: string;
    name: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
}

export const CURRENCY_RATES: Record<string, { rate: number; symbol: string; code: string }> = {
    'AED': { rate: 1.0, symbol: 'AED', code: 'AED' },
    'SAR': { rate: 1.02, symbol: 'ر.س', code: 'SAR' },
    'USD': { rate: 0.272, symbol: '$', code: 'USD' },
    'EUR': { rate: 0.25, symbol: '€', code: 'EUR' },
    'INR': { rate: 22.7, symbol: '₹', code: 'INR' },
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
    clearCart: () => void;
    cartTotal: number;
    cartCount: number;

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
    accessToken: string | null;
    guestSessionId: string;
    setUser: (user: UserProfile | null) => void;
    login: (email: string, password?: string, phone?: string) => Promise<any>;
    register: (payload: { email: string; password?: string; firstName?: string; lastName?: string; phone?: string }) => Promise<any>;
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

export function ShopProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);

    const [user, setUser] = useState<UserProfile | null>(null);
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
                    setCart(mergedCart.items);
                    localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(mergedCart.items));
                }
            } else {
                const remoteCart = await fetchCartApi(token);
                if (remoteCart?.items) {
                    setCart(remoteCart.items);
                    localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(remoteCart.items));
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
                    initialCart = normalized;
                    setCart(normalized);
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
                    });
                    // Trigger DB sync for authenticated user
                    syncWithBackendOnAuth(savedToken, initialCart, initialWishlist);
                } else {
                    localStorage.removeItem('auth_access_token');
                    setAccessToken(null);
                }
            }).catch(() => {
                localStorage.removeItem('auth_access_token');
                setAccessToken(null);
            });
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
    const getConvertedPrice = (basePriceAED: number): number => {
        const rateInfo = CURRENCY_RATES[currency] || CURRENCY_RATES['AED'];
        return basePriceAED * rateInfo.rate;
    };

    const formatPrice = (basePriceAED: number): string => {
        const rateInfo = CURRENCY_RATES[currency] || CURRENCY_RATES['AED'];
        const val = basePriceAED * rateInfo.rate;
        return `${rateInfo.symbol} ${val.toFixed(2)}`;
    };

    const addToCart = (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => {
        const minMoq = Math.max(1, item.moq || 1);
        const addQty = item.quantity && item.quantity >= minMoq ? item.quantity : minMoq;
        const normalizedPrice = Number(item.price || 0);

        setCart(prev => {
            const existingIndex = prev.findIndex(i => i.id === item.id || (item.variantId && i.variantId === item.variantId));
            if (existingIndex > -1) {
                const updated = [...prev];
                const existing = updated[existingIndex];
                updated[existingIndex] = {
                    ...existing,
                    price: normalizedPrice || existing.price,
                    quantity: existing.quantity + addQty,
                    moq: item.moq || existing.moq || 1,
                };
                return updated;
            }
            return [...prev, {
                ...item,
                price: normalizedPrice,
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
                price: normalizedPrice,
                moq: item.moq,
                moqStep: item.moqStep,
                category: item.category,
                specifications: item.specifications,
            }, accessToken).catch(err => console.error('Background addToCartApi failed:', err));
        }
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.id !== id && i.itemId !== id));

        if (accessToken) {
            removeCartItemApi(id, accessToken).catch(err => console.error('Background removeCartItemApi failed:', err));
        }
    };

    const updateQuantity = (id: string, delta: number) => {
        let finalQty = 0;
        setCart(prev =>
            prev.map(item => {
                if (item.id === id || item.itemId === id) {
                    const minMoq = Math.max(1, item.moq || 1);
                    const step = Math.max(1, item.moqStep || 1);
                    const proposedQty = item.quantity + (delta * step);
                    if (proposedQty < minMoq) return item; // Cannot drop below MOQ
                    finalQty = proposedQty;
                    return { ...item, quantity: proposedQty };
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
            });

            // Perform automatic Cart & Wishlist merge with backend upon login
            if (data.accessToken) {
                await syncWithBackendOnAuth(data.accessToken, cart, wishlist);
            }
        }
        return data;
    };

    const register = async (payload: { email: string; password?: string; firstName?: string; lastName?: string; phone?: string }) => {
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
    const cartTotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
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
                clearCart,
                cartTotal,
                cartCount,
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
