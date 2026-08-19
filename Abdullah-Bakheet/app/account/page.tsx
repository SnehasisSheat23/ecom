"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { User, Building2, ShoppingBag, FileText, LogOut, ChevronLeft, ShieldCheck } from 'lucide-react';

export default function AccountPage() {
    const { user, isCorporateUser, logout, formatPrice, language } = useShop();
    const router = useRouter();
    const isArabic = language.startsWith('Arabic');

    React.useEffect(() => {
        if (!user) {
            router.push('/login');
        }
    }, [user, router]);

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50/60 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                {/* Back button */}
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors mb-6 text-sm font-medium"
                >
                    <ChevronLeft size={16} />
                    <span>{isArabic ? 'العودة للتسوق' : 'Back to Store'}</span>
                </button>

                {/* Header Title */}
                <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-[#1a2b25] text-[#fbdc3c] flex items-center justify-center font-bold text-2xl shrink-0">
                            {(user.name || user.firstName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-bold text-gray-900">{user.name || `${user.firstName || ''} ${user.lastName || ''}`}</h1>
                                {isCorporateUser ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                        <ShieldCheck size={12} />
                                        {isArabic ? 'شريك تجاري معتمد' : 'Corporate Partner'}
                                    </span>
                                ) : (
                                    <span className="text-[11px] font-medium bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full">
                                        {isArabic ? 'حساب شخصي' : 'Individual Account'}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
                            {user.phone && <p className="text-xs text-gray-400 font-mono mt-0.5">{user.phone}</p>}
                        </div>
                    </div>

                    <button
                        onClick={() => {
                            logout();
                            router.push('/');
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors self-start sm:self-center"
                    >
                        <LogOut size={14} />
                        <span>{isArabic ? 'تسجيل الخروج' : 'Sign Out'}</span>
                    </button>
                </div>

                {/* Profile Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card 1: Account Information */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                        <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
                            <User size={18} className="text-gray-700" />
                            <h2 className="font-bold text-sm text-gray-900">
                                {isArabic ? 'بيانات الحساب' : 'Account Details'}
                            </h2>
                        </div>

                        <dl className="space-y-3 text-xs">
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <dt className="text-gray-500">{isArabic ? 'الاسم بالكامل' : 'Full Name'}</dt>
                                <dd className="font-semibold text-gray-900">{user.name || '-'}</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <dt className="text-gray-500">{isArabic ? 'البريد الإلكتروني' : 'Email'}</dt>
                                <dd className="font-semibold text-gray-900">{user.email}</dd>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <dt className="text-gray-500">{isArabic ? 'رقم الهاتف' : 'Phone'}</dt>
                                <dd className="font-semibold text-gray-900">{user.phone || '-'}</dd>
                            </div>
                            <div className="flex justify-between py-1">
                                <dt className="text-gray-500">{isArabic ? 'نوع الحساب' : 'Account Type'}</dt>
                                <dd className="font-semibold text-gray-900 capitalize">{user.customerGroup || 'Retail'}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* Card 2: Corporate & Credit Information (if Corporate) */}
                    {isCorporateUser ? (
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                            <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
                                <Building2 size={18} className="text-emerald-700" />
                                <h2 className="font-bold text-sm text-gray-900">
                                    {isArabic ? 'بيانات المنشأة والتسهيلات' : 'Corporate & Credit Details'}
                                </h2>
                            </div>

                            <dl className="space-y-3 text-xs">
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <dt className="text-gray-500">{isArabic ? 'اسم الشركة' : 'Company Name'}</dt>
                                    <dd className="font-semibold text-gray-900">{user.companyName || 'Corporate Partner'}</dd>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <dt className="text-gray-500">{isArabic ? 'الرقم الضريبي / السجل' : 'Tax ID / TRN'}</dt>
                                    <dd className="font-mono font-semibold text-gray-900">{user.companyTaxId || user.crNumber || '-'}</dd>
                                </div>
                                <div className="flex justify-between py-1 border-b border-gray-50">
                                    <dt className="text-gray-500">{isArabic ? 'الرصيد الائتماني المتاح' : 'Available Credit Limit'}</dt>
                                    <dd className="font-bold text-emerald-800">{formatPrice(user.availableCredit || 50000)}</dd>
                                </div>
                                <div className="flex justify-between py-1">
                                    <dt className="text-gray-500">{isArabic ? 'شروط السداد' : 'Payment Terms'}</dt>
                                    <dd className="font-semibold text-gray-900 uppercase">{user.paymentTerms || 'NET 30'}</dd>
                                </div>
                            </dl>
                        </div>
                    ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
                                    <Building2 size={18} className="text-gray-700" />
                                    <h2 className="font-bold text-sm text-gray-900">
                                        {isArabic ? 'الترقية لحساب شركات' : 'Upgrade to Corporate Account'}
                                    </h2>
                                </div>
                                <p className="text-xs text-gray-500 leading-relaxed">
                                    {isArabic 
                                        ? 'هل تشتري لفندق أو مطعم أو منشأة تجارية؟ احصل على أسعار الجملة وتسهيلات دفع بالأجل (Net 30).'
                                        : 'Purchasing for hospitality, restaurants, or commercial projects? Unlock wholesale partner pricing and Net 30 credit terms.'}
                                </p>
                            </div>
                            <Link 
                                href="/cart/rfq" 
                                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
                            >
                                <FileText size={14} />
                                <span>{isArabic ? 'طلب تسعيرة خاصة (RFQ)' : 'Request Wholesale Quote'}</span>
                            </Link>
                        </div>
                    )}
                </div>

                {/* Quick Actions Bar */}
                <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">
                            {isArabic ? 'الطلبات وعروض الأسعار' : 'Orders & Quotation Requests'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {isArabic ? 'استعرض مشترياتك وسجلات عروض الأسعار السابقة' : 'Review your active purchases and official quotation requests'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Link 
                            href="/cart"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg text-xs font-semibold transition-colors"
                        >
                            <ShoppingBag size={14} />
                            <span>{isArabic ? 'السلة' : 'My Cart'}</span>
                        </Link>
                        <Link 
                            href="/cart/rfq"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                            <FileText size={14} />
                            <span>{isArabic ? 'طلب تسعيرة' : 'Request RFQ'}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
