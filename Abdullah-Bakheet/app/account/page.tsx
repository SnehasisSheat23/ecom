"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { User, Building2, ShoppingBag, FileText, LogOut, ChevronLeft, ShieldCheck, Loader2, Truck } from 'lucide-react';

export default function AccountPage() {
    const { user, isAuthLoading, isCorporateUser, logout, formatPrice, language } = useShop();
    const router = useRouter();
    const isArabic = language.startsWith('Arabic');

    React.useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push('/login');
        }
    }, [user, isAuthLoading, router]);

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-gray-50/60 py-12 px-4 sm:px-6 lg:px-8 animate-pulse">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Back Button Skeleton */}
                    <div className="h-4 w-28 bg-gray-200 rounded-md"></div>

                    {/* Header Skeleton */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gray-200 shrink-0"></div>
                            <div className="space-y-2">
                                <div className="h-6 w-48 bg-gray-200 rounded"></div>
                                <div className="h-4 w-32 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                        <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
                    </div>

                    {/* Grid Cards Skeleton */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                            <div className="h-4 w-24 bg-gray-200 rounded"></div>
                            <div className="space-y-3">
                                <div className="h-4 w-full bg-gray-100 rounded"></div>
                                <div className="h-4 w-full bg-gray-100 rounded"></div>
                                <div className="h-4 w-full bg-gray-100 rounded"></div>
                            </div>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                            <div className="h-4 w-32 bg-gray-200 rounded"></div>
                            <div className="space-y-3">
                                <div className="h-4 w-full bg-gray-100 rounded"></div>
                                <div className="h-4 w-full bg-gray-100 rounded"></div>
                                <div className="h-4 w-full bg-gray-100 rounded"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

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

                    <div className="flex items-center gap-3">
                        
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
                </div>

                {/* Profile Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Card 1: Account Information */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
                        <div className="flex items-center gap-2 pb-4 border-b border-gray-100 mb-4">
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
                                    <Building2 size={16} className="text-amber-600" />
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

                {/* Quick Orders & Tracking Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-900">
                            {isArabic ? 'تتبع شحناتك وطلبياتك مباشرة' : 'Track Your Active Shipments & Orders'}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-xl">
                            {isArabic 
                                ? 'استعرض مسار التوصيل، تفاصيل المنتجات، والفواتير الضريبية لكل طلبية.'
                                : 'View step-by-step dispatch status, itemized invoice breakdown, and delivery notes in real-time.'}
                        </p>
                    </div>
                    <Link
                        href="/track-order"
                        className="inline-flex items-center gap-1.5 bg-[#1a2b25] hover:bg-black text-white hover:text-[#fbdc3c] font-semibold text-xs px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
                    >
                        <ShoppingBag size={13} />
                        <span>{isArabic ? 'عرض كل الطلبات' : 'View Orders & Tracking'}</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
