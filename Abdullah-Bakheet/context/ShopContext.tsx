"use client";

import React, { createContext, useContext, useState } from 'react';

export interface CartItem {
    id: string;
    name: string;
    category: string;
    price: number;
    quantity: number;
    image: string;
}

export interface WishlistItem {
    id: string;
    name: string;
    category: string;
    price: number;
    image: string;
}

interface ShopContextType {
    // Cart State
    cart: CartItem[];
    isCartOpen: boolean;
    setIsCartOpen: (open: boolean) => void;
    addToCart: (item: Omit<CartItem, 'quantity'>) => void;
    removeFromCart: (id: string) => void;
    updateQuantity: (id: string, delta: number) => void;
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

    // User Account Modal
    isAccountOpen: boolean;
    setIsAccountOpen: (open: boolean) => void;
    user: { name: string; email: string } | null;
    setUser: (user: { name: string; email: string } | null) => void;

    // Preference state
    language: string;
    setLanguage: (lang: string) => void;
    currency: string;
    setCurrency: (curr: string) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export function ShopProvider({ children }: { children: React.ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([
        {
            id: '1',
            name: 'Nestol Premium Mustard',
            category: 'Sauces & Dressings',
            price: 24.50,
            quantity: 1,
            image: '/api/placeholder/160/160'
        }
    ]);
    const [wishlist, setWishlist] = useState<WishlistItem[]>([
        {
            id: '2',
            name: 'Organic Mushroom Pickles',
            category: 'Pickles',
            price: 18.00,
            image: '/api/placeholder/160/160'
        }
    ]);

    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isWishlistOpen, setIsWishlistOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);

    const [user, setUser] = useState<{ name: string; email: string } | null>(null);
    const [language, setLanguage] = useState('English');
    const [currency, setCurrency] = useState('ر.س');

    const addToCart = (item: Omit<CartItem, 'quantity'>) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
        setIsCartOpen(true);
    };

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.id !== id));
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev =>
            prev
                .map(item => {
                    if (item.id === id) {
                        const newQty = item.quantity + delta;
                        return newQty > 0 ? { ...item, quantity: newQty } : null;
                    }
                    return item;
                })
                .filter(Boolean) as CartItem[]
        );
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
                setUser,
                language,
                setLanguage,
                currency,
                setCurrency,
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
