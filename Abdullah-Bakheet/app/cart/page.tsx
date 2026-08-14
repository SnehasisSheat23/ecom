"use client";

import React from 'react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import ConnectCTA from '@/components/ConnectCTA';
import { ArrowUpRightIcon, DeleteIcon, PlusIcon } from 'lucide-animated';
import { Minus } from 'lucide-react';

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, cartTotal, language, currency, formatPrice } = useShop();
    const isArabic = language.startsWith('Arabic');
    
    const subtotalFormatted = formatPrice(cartTotal);

    return (
        <div className="flex flex-col w-full bg-brand-gray min-h-screen font-sans">
            
            {/* Header Section */}
            <div className="pt-20 pb-12 flex justify-center items-center px-4">
                <h1 className={`font-heading text-4xl md:text-6xl lg:text-8xl uppercase text-[#1a2b25] tracking-wider flex flex-wrap justify-center items-center gap-3 md:gap-4 text-center ${isArabic ? 'font-sans font-black tracking-tight' : ''}`}>
                    {isArabic ? 'سلة' : 'MY'}
                    <span className="bg-[#fbdc3c] px-4 pt-2 pb-1 text-[#1a2b25]">{isArabic ? 'المشتريات' : 'CART'}</span>
                </h1>
            </div>

            {/* Main Content Area */}
            <div className="px-4 pb-20 w-full max-w-[1200px] mx-auto">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                        <p className="text-gray-500 text-lg mb-6 font-medium">
                            {isArabic ? 'سلة المشتريات فارغة حالياً' : 'Your cart is currently empty.'}
                        </p>
                        <Link href="/products" className="bg-[#1a2b25] text-white px-8 py-3.5 rounded-full font-medium text-sm hover:bg-[#22322a] transition-colors">
                            {isArabic ? 'تصفح المنتجات' : 'Browse Products'}
                        </Link>
                    </div>
                ) : (
                    <div className="flex flex-col lg:flex-row gap-8 items-start">
                        
                        {/* Cart Table Container */}
                        <div className="w-full lg:w-2/3 bg-white shadow-[0_4px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-50 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                                            <th className={`py-4 px-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                                                {isArabic ? 'المنتجات' : 'PRODUCTS'}
                                            </th>
                                            <th className="py-4 px-4 text-center">
                                                {isArabic ? 'الكمية' : 'QUANTITY'}
                                            </th>
                                            <th className={`py-4 px-4 ${isArabic ? 'text-left' : 'text-right'}`}>
                                                {isArabic ? 'المجموع' : 'TOTAL'}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {cart.map((item, index) => {
                                            const minMoq = Math.max(1, item.moq || 1);
                                            const isAtMoq = item.quantity <= minMoq;
                                            return (
                                                <tr key={item.itemId || `${item.id}-${item.variantId || ''}-${index}`} className="hover:bg-gray-50/30 transition-colors">
                                                    <td className="py-6 px-6">
                                                        <div className={`flex items-center gap-4 ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                                                            <div className="flex items-center gap-3 shrink-0">
                                                                <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-lg p-2 flex items-center justify-center border border-gray-100 shrink-0">
                                                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                                </div>
                                                                <button 
                                                                    onClick={() => removeFromCart(item.id)}
                                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                                    title={isArabic ? 'إزالة العنصر' : 'Remove item'}
                                                                >
                                                                    <DeleteIcon size={14} />
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <p className="font-semibold text-gray-800 text-[14px] md:text-[15px] uppercase tracking-wide leading-snug mb-1">
                                                                    {item.name}
                                                                </p>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="text-gray-500 text-[13px]">
                                                                        {formatPrice(item.price)} / {isArabic ? 'وحدة' : 'unit'}
                                                                    </p>
                                                                    {item.moq && item.moq > 1 && (
                                                                        <span className="text-[10px] text-amber-800 bg-amber-50 font-bold px-1.5 py-0.5 rounded border border-amber-200">
                                                                            {isArabic ? `الحد الأدنى: ${item.moq}` : `MOQ: ${item.moq}`}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-6 px-4">
                                                        <div className="flex items-center justify-center gap-4">
                                                            <div className="flex items-center border border-gray-200 rounded-md bg-gray-50/50 p-1">
                                                                <button 
                                                                    onClick={() => updateQuantity(item.id, -1)}
                                                                    disabled={isAtMoq}
                                                                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-all shadow-sm disabled:opacity-40 disabled:hover:bg-transparent"
                                                                    title={isAtMoq ? `Minimum order quantity is ${minMoq}` : undefined}
                                                                >
                                                                    <Minus size={16} />
                                                                </button>
                                                                <span className="w-10 text-center font-semibold text-gray-800 text-[15px]">
                                                                    {item.quantity}
                                                                </span>
                                                                <button 
                                                                    onClick={() => updateQuantity(item.id, 1)}
                                                                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-all shadow-sm"
                                                                >
                                                                    <PlusIcon size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`py-6 px-4 ${isArabic ? 'text-left' : 'text-right'}`}>
                                                        <span className="font-semibold text-gray-900 text-[15px] md:text-[17px]">
                                                            {formatPrice(item.price * item.quantity)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Order Summary Card */}
                        <div className="w-full lg:w-1/3 bg-white shadow-[0_4px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-50 rounded-xl p-6 md:p-8 sticky top-32">
                            <h3 className={`text-[17px] font-semibold text-gray-900 uppercase tracking-wide mb-8 ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'ملخص الطلب' : 'Order Summary'}
                            </h3>
                            
                            <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 mb-6">
                                <div className="flex justify-between items-center text-[15px]">
                                    <span className="text-gray-500">{isArabic ? 'المجموع الفرعي' : 'Sub-Total'}</span>
                                    <span className="font-semibold text-gray-800">{subtotalFormatted}</span>
                                </div>
                                <div className="flex justify-between items-center text-[15px]">
                                    <span className="text-gray-500">{isArabic ? 'الشحن' : 'Shipping'}</span>
                                    <span className="text-[13px] text-gray-500 font-medium">{isArabic ? 'يُحسب عند الدفع' : 'Calculated at checkout'}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-[16px] mb-10">
                                <span className="text-gray-500">{isArabic ? 'المجموع الكلي' : 'Total'}</span>
                                <span className="font-bold text-gray-900 text-[18px]">{subtotalFormatted}</span>
                            </div>

                            <Link href="/checkout" className="w-full bg-[#1a2b25] text-white py-4 px-6 flex justify-between items-center hover:bg-[#22322a] transition-colors font-medium text-[15px] uppercase tracking-wider group rounded-md">
                                <span>{isArabic ? 'إتمام الشراء' : 'Checkout'}</span>
                                <ArrowUpRightIcon size={20} className="stroke-[1.5] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </Link>
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
