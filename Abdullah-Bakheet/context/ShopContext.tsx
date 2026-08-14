"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
    loginApi,
    registerApi,
    fetchMeApi,
} from '@/lib/api';

export interface CartItem {
    id: string; // Product/Variant ID
    itemId?: string;
    variantId?: string;
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
    category: string;
    price: number;
    image: string;
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

    // Wishlist State
    wishlist: WishlistItem[];
    isWishlistOpen: boolean;
    setIsWishlistOpen: (open: boolean) => void;
    toggleWishlist: (item: WishlistItem) => void;
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

    // 1. Restore local cart, wishlist, and token on mount
    useEffect(() => {
        setIsMounted(true);
        const sid = getOrCreateGuestSessionId();
        setGuestSessionId(sid);

        try {
            const savedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
            if (savedCart) {
                const parsed = JSON.parse(savedCart);
                if (Array.isArray(parsed)) setCart(parsed);
            }

            const savedWishlist = localStorage.getItem(LOCAL_STORAGE_WISHLIST_KEY);
            if (savedWishlist) {
                const parsed = JSON.parse(savedWishlist);
                if (Array.isArray(parsed)) setWishlist(parsed);
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
                } else {
                    localStorage.removeItem('auth_access_token');
                    setAccessToken(null);
                }
            }).catch(() => {
                localStorage.removeItem('auth_access_token');
                setAccessToken(null);
            });
        }
    }, []);

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

        setCart(prev => {
            const existingIndex = prev.findIndex(i => i.id === item.id || (item.variantId && i.variantId === item.variantId));
            if (existingIndex > -1) {
                const updated = [...prev];
                const existing = updated[existingIndex];
                updated[existingIndex] = {
                    ...existing,
                    quantity: existing.quantity + addQty,
                    moq: item.moq || existing.moq || 1,
                };
                return updated;
            }
            return [...prev, {
                ...item,
                quantity: addQty,
                moq: minMoq,
                moqStep: item.moqStep || 1,
            }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.id !== id && i.itemId !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev =>
            prev.map(item => {
                if (item.id === id || item.itemId === id) {
                    const minMoq = Math.max(1, item.moq || 1);
                    const step = Math.max(1, item.moqStep || 1);
                    const proposedQty = item.quantity + (delta * step);
                    if (proposedQty < minMoq) return item; // Cannot drop below MOQ
                    return { ...item, quantity: proposedQty };
                }
                return item;
            })
        );
    };

    const clearCart = () => {
        setCart([]);
        try {
            localStorage.removeItem(LOCAL_STORAGE_CART_KEY);
        } catch (e) {
            console.error('Failed to clear cart storage:', e);
        }
    };

    const toggleWishlist = (item: WishlistItem) => {
        setWishlist(prev => {
            const exists = prev.some(i => i.id === item.id);
            if (exists) {
                return prev.filter(i => i.id !== item.id);
            }
            return [...prev, item];
        });
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
    const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    const wishlistCount = wishlist.length;

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


