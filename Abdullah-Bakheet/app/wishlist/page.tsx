"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import ConnectCTA from '@/components/ConnectCTA';
import { ArrowUpRightIcon, CartIcon, CircleCheckIcon, DeleteIcon } from 'lucide-animated';
import { XCircle } from 'lucide-react';

export default function WishlistPage() {
    const router = useRouter();
    const { wishlist, addToCart, toggleWishlist, language, currency, formatPrice, accessToken } = useShop();
    const isArabic = language.startsWith('Arabic');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!accessToken && mounted) {
            router.replace('/login?redirect=/wishlist');
        }
    }, [accessToken, mounted, router]);

    if (!accessToken && mounted) {
        return (
            <div className="w-full bg-brand-gray min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2b25]"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full bg-brand-gray min-h-screen">
            
            {/* Header Section */}
            <div className="pt-8 pb-6 md:pt-20 md:pb-12 flex justify-center items-center px-4">
                <h1 className={`font-heading text-2xl sm:text-4xl md:text-6xl lg:text-7xl uppercase text-[#1a2b25] tracking-normal md:tracking-wider flex flex-wrap items-center justify-center gap-2 md:gap-4 text-center ${isArabic ? 'font-sans font-black tracking-tight' : ''}`}>
                    <span>{isArabic ? 'المنتجات الأقرب' : 'MY MOST LIKED'}</span>
                    <span className="text-[#1a2b25]">{isArabic ? 'لقلبي' : 'PRODUCTS'}</span>
                </h1>
            </div>

            {/* Main Content Area */}
            <div className="px-4 pb-20 w-full max-w-[1200px] mx-auto">
                {!mounted ? (
                    <div className="bg-white shadow-[0_4px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-50 rounded-xl p-10 flex flex-col items-center justify-center w-full max-w-4xl mx-auto animate-pulse">
                        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-[#1a2b25] animate-spin mb-4" />
                        <p className="text-gray-400 text-sm font-medium">
                            {isArabic ? 'جاري تحميل المفضلة...' : 'Loading wishlist...'}
                        </p>
                    </div>
                ) : wishlist.length === 0 ? (
                    /* Empty State */
                    <div className="bg-white shadow-[0_4px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-50 rounded-xl p-8 sm:p-10 md:p-16 flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
                        <img 
                            src="/images/Group.jpg" 
                            alt="Empty Wishlist" 
                            className="w-full max-w-[280px] sm:max-w-[350px] h-auto mb-6 sm:mb-10 object-contain" 
                        />
                        <h2 className="text-2xl sm:text-3xl md:text-4xl text-[#1a2b25] mb-3 sm:mb-4 font-light text-center">
                            {isArabic ? 'قائمة المفضلة فارغة' : 'Your WishList is Empty'}
                        </h2>
                        <p className="text-gray-500 text-center max-w-sm mx-auto italic mb-8 sm:mb-10 text-[14px] sm:text-[15px]">
                            {isArabic ? 'اختر من مجموعات منتجاتنا لبناء قائمة المفضلة المثالية الخاصة بك.' : 'Select from our product collections to build your perfect wishlist.'}
                        </p>
                        <Link 
                            href="/products" 
                            className="bg-[#1a2b25] text-white px-8 py-3.5 flex items-center gap-2 hover:bg-[#22322a] transition-colors font-medium text-[15px] rounded-full shadow-sm"
                        >
                            <span>{isArabic ? 'تصفح المنتجات' : 'View Products'}</span>
                            <ArrowUpRightIcon size={18} className="stroke-[1.5]" />
                        </Link>
                    </div>
                ) : (
                    /* Filled State */
                    <div className="bg-white shadow-[0_4px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-50 rounded-xl overflow-hidden">
                        
                        {/* Desktop Table View */}
                        <div className="hidden md:block p-6 md:p-10 overflow-x-auto w-full">
                            <table className={`w-full text-left min-w-[750px] ${isArabic ? 'text-right' : 'text-left'}`}>
                                <thead>
                                    <tr className="border-b border-gray-100">
                                        <th className="pb-4 px-4 text-[15px] font-semibold text-gray-800">{isArabic ? 'العنصر' : 'Items'}</th>
                                        <th className="pb-4 px-4 text-[15px] font-semibold text-gray-800">{isArabic ? 'اسم المنتج' : 'Product title'}</th>
                                        <th className="pb-4 px-4 text-[15px] font-semibold text-gray-800">{isArabic ? 'السعر' : 'Price'}</th>
                                        <th className="pb-4 px-4 text-[15px] font-semibold text-gray-800">{isArabic ? 'الحالة' : 'Status'}</th>
                                        <th className="pb-4 px-4 text-[15px] font-semibold text-gray-800">{isArabic ? 'الإجراء' : 'Action'}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wishlist.map((item) => {
                                        const isOutOfStock = (item as any).status === 'inactive';
                                        
                                        return (
                                            <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                                                <td className="py-5 px-4">
                                                    <div className="w-20 h-20 bg-white rounded-md border border-gray-100 flex items-center justify-center p-2">
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                    </div>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <p className="font-medium text-gray-700 text-[15px] max-w-[200px] leading-snug">
                                                        {item.name}
                                                    </p>
                                                </td>
                                                <td className="py-5 px-4">
                                                    <span className="font-semibold text-gray-900 text-[15px]">
                                                        {formatPrice(item.price)}
                                                    </span>
                                                </td>
                                                <td className="py-5 px-4">
                                                    {isOutOfStock ? (
                                                        <span className="inline-flex items-center gap-1.5 bg-[#ffebee] text-[#c62828] px-3 py-1.5 rounded-md text-[13px] font-medium">
                                                            <XCircle size={14} className="stroke-[2.5]" /> {isArabic ? 'غير متوفر' : 'Out Of Stock'}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 bg-[#e8f5e9] text-[#2e7d32] px-3 py-1.5 rounded-md text-[13px] font-medium">
                                                            <CircleCheckIcon size={14} className="stroke-[2.5]" /> {isArabic ? 'متوفر بالمخزون' : 'In Stock'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-5 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={() => {
                                                                if (!isOutOfStock) {
                                                                    addToCart({
                                                                        ...item,
                                                                        category: item.category || '',
                                                                    });
                                                                    router.push('/cart');
                                                                }
                                                            }}
                                                            disabled={isOutOfStock}
                                                            className={`inline-flex items-center gap-2 border border-gray-200 rounded-full px-5 py-2 text-[14px] font-medium transition-colors ${
                                                                isOutOfStock 
                                                                ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400' 
                                                                : 'hover:border-gray-300 hover:bg-gray-50 text-gray-700'
                                                            }`}
                                                        >
                                                            <CartIcon size={16} className="stroke-[1.5]" /> {isArabic ? 'إضافة للسلة' : 'Add to cart'}
                                                        </button>
                                                        <button
                                                            onClick={() => toggleWishlist(item)}
                                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                            title={isArabic ? 'إزالة من المفضلة' : 'Remove from wishlist'}
                                                        >
                                                            <DeleteIcon size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card List View */}
                        <div className="block md:hidden divide-y divide-gray-100">
                            {wishlist.map((item) => {
                                const isOutOfStock = (item as any).status === 'inactive';
                                return (
                                    <div key={item.id} className="p-4 flex flex-col gap-3">
                                        {/* Top Row: Image + Title + Price + Delete */}
                                        <div className={`flex items-start gap-3 w-full ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 min-w-16 min-h-16 bg-white rounded-lg border border-gray-100 flex items-center justify-center p-1.5 shrink-0">
                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className={`flex items-start justify-between gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                                    <p className="font-semibold text-gray-800 text-[13px] sm:text-[14px] uppercase tracking-wide leading-snug">
                                                        {item.name}
                                                    </p>
                                                    <button
                                                        onClick={() => toggleWishlist(item)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0 cursor-pointer"
                                                        title={isArabic ? 'إزالة من المفضلة' : 'Remove from wishlist'}
                                                    >
                                                        <DeleteIcon size={16} />
                                                    </button>
                                                </div>

                                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                                    <span className="font-bold text-gray-900 text-[14px]">
                                                        {formatPrice(item.price)}
                                                    </span>
                                                    {isOutOfStock ? (
                                                        <span className="inline-flex items-center gap-1 bg-[#ffebee] text-[#c62828] px-2 py-0.5 rounded text-[11px] font-medium">
                                                            <XCircle size={12} className="stroke-[2.5]" /> {isArabic ? 'غير متوفر' : 'Out Of Stock'}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 bg-[#e8f5e9] text-[#2e7d32] px-2 py-0.5 rounded text-[11px] font-medium">
                                                            <CircleCheckIcon size={12} className="stroke-[2.5]" /> {isArabic ? 'متوفر' : 'In Stock'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Row: Add to Cart Button */}
                                        <button 
                                            onClick={() => {
                                                if (!isOutOfStock) {
                                                    addToCart({
                                                        ...item,
                                                        category: item.category || '',
                                                    });
                                                    router.push('/cart');
                                                }
                                            }}
                                            disabled={isOutOfStock}
                                            className={`w-full flex items-center justify-center gap-2 rounded-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider transition-colors ${
                                                isOutOfStock 
                                                ? 'opacity-50 cursor-not-allowed bg-gray-50 text-gray-400 border border-gray-200' 
                                                : 'bg-[#1a2b25] text-white hover:bg-black shadow-xs cursor-pointer'
                                            }`}
                                        >
                                            <CartIcon size={15} className="stroke-[2]" />
                                            <span>{isArabic ? 'إضافة للسلة' : 'Add to cart'}</span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Global Connect CTA before the footer */}
            <div className="mt-auto">
                <ConnectCTA />
            </div>

        </div>
    );
}

