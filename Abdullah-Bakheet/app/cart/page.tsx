"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useShop } from '@/context/ShopContext';
import ConnectCTA from '@/components/ConnectCTA';
import { ArrowUpRightIcon, DeleteIcon, PlusIcon } from 'lucide-animated';
import { Minus } from 'lucide-react';

export default function CartPage() {
    const { cart, removeFromCart, updateQuantity, setQuantity, cartTotal, cartSavings, isCorporateUser, user, language, currency, formatPrice } = useShop();
    const isArabic = language.startsWith('Arabic');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);
    
    const subtotalFormatted = formatPrice(cartTotal);
    const savingsFormatted = formatPrice(cartSavings);
    const totalCartUnits = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const qualifiesForRfq = totalCartUnits >= 50 || isCorporateUser;

    return (
        <div className="flex flex-col w-full bg-brand-gray min-h-screen font-sans">
            
            {/* Header Section */}
            <div className="pt-8 pb-6 md:pt-20 md:pb-12 flex justify-center items-center px-4">
                <h1 className={`font-heading text-3xl sm:text-5xl md:text-6xl lg:text-8xl uppercase text-[#1a2b25] tracking-normal md:tracking-wider flex items-center justify-center gap-2 md:gap-4 text-center ${isArabic ? 'font-sans font-black tracking-tight' : ''}`}>
                    <span>{isArabic ? 'سلة' : 'MY'}</span>
                    <span className="text-[#1a2b25]">{isArabic ? 'المشتريات' : 'CART'}</span>
                </h1>
            </div>

            {/* Corporate Banner if logged in */}
            {isCorporateUser && mounted && (
                <div className="max-w-[1200px] mx-auto w-full px-4 mb-6">
                    <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div>
                            <h4 className="font-semibold text-gray-900 text-xs">
                                {isArabic ? `حساب شركات: ${user?.companyName || 'مؤسستك'}` : `Corporate Account: ${user?.companyName || 'Your Company'}`}
                            </h4>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                {isArabic 
                                    ? `الرصيد الائتماني المتاح: ${formatPrice(user?.availableCredit || 0)} | شروط الدفع: ${user?.paymentTerms?.toUpperCase() || 'NET 30'}`
                                    : `Available Credit Line: ${formatPrice(user?.availableCredit || 0)} | Payment Terms: ${user?.paymentTerms?.toUpperCase() || 'NET 30'}`}
                            </p>
                        </div>
                        <span className="text-[11px] font-medium text-gray-700 bg-gray-200/70 px-2.5 py-1 rounded w-fit">
                            {user?.accountDiscountPercent ? `-${user.accountDiscountPercent}% Discount` : (isArabic ? 'أسعار الجملة مفعلة' : 'Wholesale Rates Active')}
                        </span>
                    </div>
                </div>
            )}

            {/* Main Content Area */}
            <div className="px-4 pb-20 w-full max-w-[1200px] mx-auto">
                {!mounted ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl shadow-sm border border-gray-100 animate-pulse">
                        <div className="w-8 h-8 rounded-full border-2 border-gray-300 border-t-[#1a2b25] animate-spin mb-4" />
                        <p className="text-gray-400 text-sm font-medium">
                            {isArabic ? 'جاري تحميل السلة...' : 'Loading your cart...'}
                        </p>
                    </div>
                ) : cart.length === 0 ? (
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
                            
                            {/* Desktop Table View */}
                            <div className="hidden md:block overflow-x-auto">
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
                                            const catalogBase = Number(item.catalogPrice || item.tieredPricing?.[0]?.price || item.price || 0);
                                            const hasVolumeDiscount = item.price < catalogBase;
                                            const itemSavings = Math.max(0, (catalogBase - item.price) * item.quantity);

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
                                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                                                    title={isArabic ? 'إزالة العنصر' : 'Remove item'}
                                                                >
                                                                    <DeleteIcon size={14} />
                                                                </button>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <p className="font-semibold text-gray-800 text-[14px] md:text-[15px] uppercase tracking-wide leading-snug mb-0.5">
                                                                    {item.name}
                                                                </p>
                                                                {(item.specifications?.packSize || item.specifications?.netWeight) && (
                                                                    <p className="text-[11px] text-gray-500 font-mono mb-1">
                                                                        {item.specifications?.packSize || item.specifications?.netWeight}
                                                                    </p>
                                                                )}
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    {hasVolumeDiscount ? (
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className="font-bold text-gray-900 text-[13px]">
                                                                                {formatPrice(item.price)}
                                                                            </span>
                                                                            <span className="text-gray-400 line-through text-[11px]">
                                                                                {formatPrice(catalogBase)}
                                                                            </span>
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-gray-500 text-[13px]">
                                                                            {formatPrice(item.price)} / {isArabic ? 'وحدة' : 'unit'}
                                                                        </p>
                                                                    )}
                                                                    {hasVolumeDiscount && (
                                                                        <span className="text-[10px] text-gray-600 bg-gray-100 font-medium px-2 py-0.5 rounded">
                                                                            {isArabic ? 'خصم الكمية مفعل' : 'Bulk Tier Applied'}
                                                                        </span>
                                                                    )}
                                                                    {item.moq && item.moq > 1 && (
                                                                        <span className="text-[10px] text-gray-600 bg-gray-100 font-medium px-2 py-0.5 rounded">
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
                                                                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-all shadow-sm disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                                                                    title={isAtMoq ? `Minimum order quantity is ${minMoq}` : undefined}
                                                                >
                                                                    <Minus size={16} />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    min={minMoq}
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const val = parseInt(e.target.value, 10);
                                                                        if (!isNaN(val)) {
                                                                            setQuantity(item.id, val);
                                                                        }
                                                                    }}
                                                                    className="w-14 text-center font-semibold text-gray-900 text-[14px] bg-white border border-gray-200 rounded py-1 px-1 focus:outline-none focus:border-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                />
                                                                <button 
                                                                    onClick={() => updateQuantity(item.id, 1)}
                                                                    className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-all shadow-sm cursor-pointer"
                                                                >
                                                                    <PlusIcon size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`py-6 px-4 ${isArabic ? 'text-left' : 'text-right'}`}>
                                                        <div className="flex flex-col items-end">
                                                            <span className="font-semibold text-gray-900 text-[15px] md:text-[17px]">
                                                                {formatPrice(item.price * item.quantity)}
                                                            </span>
                                                            {itemSavings > 0 && (
                                                                <span className="text-[11px] text-gray-500 font-medium">
                                                                    {isArabic ? `وفرت ${formatPrice(itemSavings)}` : `Saved ${formatPrice(itemSavings)}`}
                                                                </span>
                                                            )}
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
                                {cart.map((item, index) => {
                                    const minMoq = Math.max(1, item.moq || 1);
                                    const isAtMoq = item.quantity <= minMoq;
                                    const catalogBase = Number(item.catalogPrice || item.tieredPricing?.[0]?.price || item.price || 0);
                                    const hasVolumeDiscount = item.price < catalogBase;
                                    const itemSavings = Math.max(0, (catalogBase - item.price) * item.quantity);

                                    return (
                                        <div key={item.itemId || `${item.id}-${item.variantId || ''}-${index}`} className="p-4 flex flex-col gap-3">
                                            {/* Top Row: Image + Details + Remove */}
                                            <div className={`flex items-start gap-3 w-full ${isArabic ? 'flex-row-reverse text-right' : ''}`}>
                                                <div className="w-16 h-16 sm:w-20 sm:h-20 min-w-16 min-h-16 bg-gray-50 rounded-lg p-1.5 flex items-center justify-center border border-gray-100 shrink-0">
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className={`flex items-start justify-between gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                                        <p className="font-semibold text-gray-800 text-[13px] sm:text-[14px] uppercase tracking-wide leading-snug">
                                                            {item.name}
                                                        </p>
                                                        <button 
                                                            onClick={() => removeFromCart(item.id)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1 shrink-0 cursor-pointer"
                                                            title={isArabic ? 'إزالة العنصر' : 'Remove item'}
                                                        >
                                                            <DeleteIcon size={16} />
                                                        </button>
                                                    </div>

                                                    {(item.specifications?.packSize || item.specifications?.netWeight) && (
                                                        <p className="text-[11px] text-gray-500 font-mono mt-0.5 mb-1">
                                                            {item.specifications?.packSize || item.specifications?.netWeight}
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        {hasVolumeDiscount ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-gray-900 text-[13px]">
                                                                    {formatPrice(item.price)}
                                                                </span>
                                                                <span className="text-gray-400 line-through text-[11px]">
                                                                    {formatPrice(catalogBase)}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <p className="text-gray-500 text-[12px]">
                                                                {formatPrice(item.price)} / {isArabic ? 'وحدة' : 'unit'}
                                                            </p>
                                                        )}
                                                        {hasVolumeDiscount && (
                                                            <span className="text-[10px] text-gray-600 bg-gray-100 font-medium px-2 py-0.5 rounded">
                                                                {isArabic ? 'خصم الكمية' : 'Bulk Tier'}
                                                            </span>
                                                        )}
                                                        {item.moq && item.moq > 1 && (
                                                            <span className="text-[10px] text-gray-600 bg-gray-100 font-medium px-2 py-0.5 rounded">
                                                                {isArabic ? `الحد الأدنى: ${item.moq}` : `MOQ: ${item.moq}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom Row: Quantity Controls + Item Total Price */}
                                            <div className={`flex items-center justify-between pt-2 border-t border-gray-50 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50/70 p-0.5">
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, -1)}
                                                        disabled={isAtMoq}
                                                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-all shadow-xs disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer"
                                                        title={isAtMoq ? `Minimum order quantity is ${minMoq}` : undefined}
                                                    >
                                                        <Minus size={14} />
                                                    </button>
                                                    <input
                                                        type="number"
                                                        min={minMoq}
                                                        value={item.quantity}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value, 10);
                                                            if (!isNaN(val)) {
                                                                setQuantity(item.id, val);
                                                            }
                                                        }}
                                                        className="w-12 text-center font-semibold text-gray-900 text-[13px] bg-white border border-gray-200 rounded py-0.5 px-1 mx-1 focus:outline-none focus:border-gray-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <button 
                                                        onClick={() => updateQuantity(item.id, 1)}
                                                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-all shadow-xs cursor-pointer"
                                                    >
                                                        <PlusIcon size={14} />
                                                    </button>
                                                </div>

                                                <div className={`flex flex-col ${isArabic ? 'items-start' : 'items-end'}`}>
                                                    <span className="font-bold text-gray-900 text-[15px]">
                                                        {formatPrice(item.price * item.quantity)}
                                                    </span>
                                                    {itemSavings > 0 && (
                                                        <span className="text-[10px] text-green-700 font-medium">
                                                            {isArabic ? `وفرت ${formatPrice(itemSavings)}` : `Saved ${formatPrice(itemSavings)}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Order Summary Card */}
                        <div className="w-full lg:w-1/3 bg-white shadow-[0_4px_30px_-10px_rgba(0,0,0,0.08)] border border-gray-50 rounded-xl p-6 md:p-8 sticky top-32">
                            <h3 className={`text-[17px] font-semibold text-gray-900 uppercase tracking-wide mb-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'ملخص الطلب' : 'Order Summary'}
                            </h3>
                            
                            <div className="flex flex-col gap-4 border-b border-gray-100 pb-5 mb-5">
                                <div className="flex justify-between items-center text-[15px]">
                                    <span className="text-gray-500">{isArabic ? 'المجموع الفرعي' : 'Sub-Total'}</span>
                                    <span className="font-semibold text-gray-800">{subtotalFormatted}</span>
                                </div>
                                {cartSavings > 0 && (
                                    <div className="flex justify-between items-center text-[14px]">
                                        <span className="text-gray-500">{isArabic ? 'وفرت في الخصم الجماعي' : 'Total Bulk Savings'}</span>
                                        <span className="font-medium text-gray-700">-{savingsFormatted}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center text-[15px]">
                                    <span className="text-gray-500">{isArabic ? 'الشحن' : 'Shipping'}</span>
                                    <span className="text-[13px] text-gray-500 font-medium">{isArabic ? 'يُحسب عند الدفع' : 'Calculated at checkout'}</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-[16px] mb-6">
                                <span className="text-gray-500">{isArabic ? 'المجموع الكلي' : 'Total'}</span>
                                <span className="font-bold text-gray-900 text-[18px]">{subtotalFormatted}</span>
                            </div>

                            {/* Standard Direct Checkout */}
                            <Link href="/checkout" className="w-full bg-[#1a2b25] text-white py-4 px-6 flex justify-between items-center hover:bg-[#22322a] transition-colors font-medium text-[15px] uppercase tracking-wider group rounded-md shadow-md mb-3">
                                <span>{isArabic ? 'إتمام الشراء' : 'Checkout'}</span>
                                <ArrowUpRightIcon size={20} className="stroke-[1.5] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </Link>

                            {/* B2B Quotation (RFQ) Button - Clean subtle two-line design */}
                            {qualifiesForRfq && (
                                <div className="pt-3 border-t border-gray-100">
                                    <Link 
                                        href="/cart/rfq" 
                                        className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-900 py-3 px-4 flex items-center justify-between transition-colors rounded-lg group"
                                    >
                                        <div className={`flex flex-col ${isArabic ? 'text-right' : 'text-left'}`}>
                                            <span className="font-semibold text-xs text-gray-900">
                                                {isArabic ? 'طلب عرض سعر ومفاوضة تجارية' : 'Request Wholesale Quotation'}
                                            </span>
                                            <span className="text-[11px] text-gray-500 font-normal mt-0.5">
                                                {isArabic ? 'تسعير مخصص للكميات الكبيرة ومشاريع التوريد' : 'Custom rates for bulk volume & contract orders'}
                                            </span>
                                        </div>
                                        <ArrowUpRightIcon size={16} className="text-gray-400 group-hover:text-black group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0 ml-2" />
                                    </Link>
                                </div>
                            )}
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
