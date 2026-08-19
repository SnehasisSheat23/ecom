"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { fetchQuotationByIdApi, acceptQuotationApi } from '@/lib/api';
import { 
    ArrowLeft, 
    ArrowUpRight, 
    CheckCircle2, 
    Clock, 
    FileCheck, 
    Loader2, 
    AlertCircle,
    Building2,
    Truck,
    CreditCard
} from 'lucide-react';
import ConnectCTA from '@/components/ConnectCTA';

export default function QuotationViewPage() {
    const params = useParams();
    const router = useRouter();
    const quoteId = params.id as string;

    const { user, isCorporateUser, formatPrice, language, accessToken } = useShop();
    const isArabic = language.startsWith('Arabic') || language === 'ar' || language === 'العربية';

    const [loading, setLoading] = useState(true);
    const [quotation, setQuotation] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Acceptance state
    const [poNumber, setPoNumber] = useState('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CREDIT_TERMS' | 'PURCHASE_ORDER' | 'BANK_TRANSFER' | 'CARD'>(
        isCorporateUser ? 'CREDIT_TERMS' : 'BANK_TRANSFER'
    );
    const [isAccepting, setIsAccepting] = useState(false);
    const [acceptSuccess, setAcceptSuccess] = useState<any | null>(null);

    const loadQuotation = async () => {
        if (!quoteId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await fetchQuotationByIdApi(quoteId, accessToken || undefined);
            setQuotation(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load quotation details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuotation();
    }, [quoteId, accessToken]);

    const handleAcceptQuotation = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsAccepting(true);
        setError(null);
        try {
            const res = await acceptQuotationApi(quoteId, {
                customerId: user?.id,
                paymentMethodType: selectedPaymentMethod,
                poNumber: poNumber || undefined,
                shippingAddressSnapshot: {
                    name: quotation?.customerName || user?.name || '',
                    company: quotation?.companyName || user?.companyName || '',
                    taxNumber: quotation?.taxNumber || user?.companyTaxId || user?.crNumber || '',
                    email: quotation?.customerEmail || user?.email || '',
                    phone: quotation?.customerPhone || user?.phone || '',
                    notes: quotation?.customerNotes || '',
                }
            }, accessToken || undefined);
            
            setAcceptSuccess(res);
            await loadQuotation();
        } catch (err: any) {
            setError(err.message || 'Failed to accept quotation');
        } finally {
            setIsAccepting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending_review':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded text-xs font-semibold">
                        <Clock size={13} className="text-amber-600" />
                        {isArabic ? 'قيد المراجعة الفنية والتسعير' : 'Under Review & Pricing'}
                    </span>
                );
            case 'quoted':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-xs font-semibold">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        {isArabic ? 'عرض أسعار معتمد وجاهز للتأكيد' : 'Official Quote Ready'}
                    </span>
                );
            case 'accepted':
            case 'converted':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded text-xs font-semibold">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        {isArabic ? 'تم تأكيد الطلب' : 'Order Placed'}
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                        {status}
                    </span>
                );
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white">
                <Loader2 size={32} className="animate-spin text-[#1a2b25] mb-3" />
                <p className="text-xs font-medium text-gray-500">
                    {isArabic ? 'جاري تحميل تفاصيل عرض السعر...' : 'Loading official quotation details...'}
                </p>
            </div>
        );
    }

    if (error && !quotation) {
        return (
            <div className="max-w-xl mx-auto px-4 py-20 text-center">
                <div className="bg-white rounded-xl p-8 border border-red-200 shadow-sm">
                    <p className="text-red-600 font-bold mb-4">{error}</p>
                    <Link href="/products" className="bg-[#1a2b25] text-white px-6 py-2.5 rounded-lg text-xs font-medium uppercase tracking-wider">
                        {isArabic ? 'العودة للرئيسية' : 'Return to Catalog'}
                    </Link>
                </div>
            </div>
        );
    }

    const items = quotation?.items || [];
    const subtotal = Number(quotation?.subtotal || 0);
    const discountAmount = Number(quotation?.discountAmount || 0);
    const shippingCost = Number(quotation?.shippingCost || quotation?.shippingAmount || 0);
    const taxAmount = Number(quotation?.taxAmount || 0);
    const totalAmount = Number(quotation?.totalAmount || 0);
    const quoteNumber = quotation?.quoteNumber || quotation?.quotationNumber || quotation?.id;
    const isQuoted = quotation?.status === 'quoted';
    const isAccepted = quotation?.status === 'accepted' || quotation?.status === 'converted';

    return (
        <div className="flex flex-col w-full bg-white min-h-screen font-sans text-gray-900 pb-20">
            
            {/* Header / Banner */}
            <div className="pt-24 pb-6 max-w-[1200px] mx-auto w-full px-4 border-b border-gray-100">
                <Link href="/cart" className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-black mb-3 transition-colors font-medium">
                    <ArrowLeft size={14} className={isArabic ? 'rotate-180' : ''} />
                    <span>{isArabic ? 'العودة إلى سلة المشتريات' : 'Back to Cart'}</span>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                                {isArabic ? 'عرض سعر تجاري:' : 'Wholesale Quotation'}{' '}
                                <span className="font-mono text-gray-700 ml-1 font-bold">
                                    {quoteNumber}
                                </span>
                            </h1>
                            {getStatusBadge(quotation?.status)}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {isArabic 
                                ? 'مراجعة الأسعار المعتمدة والشروط التجارية لأمر التوريد.'
                                : 'Review authorized line rates and commercial terms for procurement.'}
                        </p>
                    </div>

                    <div className="text-xs text-gray-500 font-mono bg-gray-50 px-3 py-1.5 rounded border border-gray-200">
                        {isArabic ? 'تاريخ الطلب:' : 'Requested:'}{' '}
                        {quotation?.createdAt ? new Date(quotation.createdAt).toLocaleDateString('en-GB') : '-'}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="px-4 py-8 w-full max-w-[1200px] mx-auto flex-1">
                
                {/* Success Banner if converted */}
                {(isAccepted || acceptSuccess) && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                            <div>
                                <h3 className="font-bold text-sm md:text-base text-emerald-900">
                                    {isArabic ? 'تم تأكيد أمر التوريد بنجاح!' : 'Quotation Converted to Official Order!'}
                                </h3>
                                <p className="text-xs text-emerald-700 mt-0.5">
                                    {isArabic 
                                        ? `رقم أمر الشراء الرسمي: ${quotation?.convertedOrderId || acceptSuccess?.order?.orderNumber || 'ORD-Q-ACTIVE'}`
                                        : `Official Order Reference: ${quotation?.convertedOrderId || acceptSuccess?.order?.orderNumber || 'ORD-Q-ACTIVE'}`}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-1.5 rounded border border-emerald-300">
                                {isArabic ? 'تم تأكيد الطلب' : 'Order Placed'}
                            </span>
                            <Link 
                                href="/account"
                                className="text-xs font-semibold text-emerald-900 underline hover:text-black flex items-center gap-1"
                            >
                                <span>{isArabic ? 'عرض في الحساب' : 'View in Account'}</span>
                                <ArrowUpRight size={13} />
                            </Link>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Left Column: Items Breakdown & Commercial Terms (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Company & Client Info Card */}
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <h3 className="text-[15px] font-semibold text-gray-900 mb-4">
                                {isArabic ? 'بيانات المنشأة والمسؤول' : 'Company & Procurement Details'}
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                                <div>
                                    <span className="text-gray-500 block mb-0.5 font-medium">{isArabic ? 'اسم الشركة' : 'Company'}</span>
                                    <span className="font-semibold text-gray-900">{quotation?.companyName || user?.companyName || 'Corporate Buyer'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-0.5 font-medium">{isArabic ? 'جهة الاتصال' : 'Contact Person'}</span>
                                    <span className="font-semibold text-gray-900">{quotation?.customerName || user?.name || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 block mb-0.5 font-medium">{isArabic ? 'البريد الإلكتروني' : 'Email'}</span>
                                    <span className="font-semibold text-gray-900 truncate block">{quotation?.customerEmail || user?.email || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Line Items Table */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                                <h3 className="text-[15px] font-semibold text-gray-900">
                                    {isArabic ? 'بنود عرض الأسعار المعتمدة' : 'Quotation Line Items & Quoted Rates'}
                                </h3>
                                <span className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded">
                                    {items.length} {isArabic ? 'أصناف' : 'items'}
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/70 border-b border-gray-200 text-gray-500 font-semibold text-[11px]">
                                            <th className="py-3 px-4">{isArabic ? 'المنتج' : 'Product Item'}</th>
                                            <th className="py-3 px-3 text-center">{isArabic ? 'الكمية' : 'Quantity'}</th>
                                            <th className="py-3 px-3 text-right">{isArabic ? 'السعر المعروض' : 'Quoted Unit Rate'}</th>
                                            <th className="py-3 px-4 text-right">{isArabic ? 'المجموع' : 'Line Total'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item: any, i: number) => {
                                            const snap = item.productNameSnapshot;
                                            const title = typeof snap === 'object' ? (snap?.en || snap?.title) : (snap || item.name || `Product #${item.productId?.slice(0, 8) || i + 1}`);
                                            const img = typeof snap === 'object' ? (snap?.image || snap?.imageUrl) : item.image;
                                            const sku = item.sku || (item as any)?.productSku || (item.productId ? item.productId.slice(0, 8).toUpperCase() : '');
                                            const qty = Number(item.requestedQuantity || item.quantity || 1);
                                            const unitRate = Number(item.quotedUnitPrice ?? item.originalUnitPrice ?? item.unitPrice ?? 0);
                                            const lineTotal = Number(item.totalPrice ?? (unitRate * qty));

                                            return (
                                                <tr key={i} className="hover:bg-gray-50/40 transition-colors">
                                                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                                                        <div className="flex items-center gap-3">
                                                            {img && (
                                                                <div className="w-10 h-10 bg-gray-50 rounded p-1 border border-gray-100 flex items-center justify-center shrink-0">
                                                                    <img src={img} alt={title} className="w-full h-full object-contain" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p className="text-xs md:text-sm font-semibold text-gray-800 line-clamp-1">
                                                                    {title}
                                                                </p>
                                                                {sku && (
                                                                    <span className="text-[10px] text-gray-400 font-mono">
                                                                        SKU: {sku}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-3 text-center">
                                                        <span className="font-semibold text-gray-800 text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
                                                            {qty} units
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-3 text-right font-semibold text-gray-900">
                                                        {formatPrice(unitRate)}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right font-bold text-gray-900">
                                                        {formatPrice(lineTotal)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Admin Sales Team Notes */}
                        {quotation?.adminNotes && (
                            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-xs text-gray-800">
                                <h4 className="font-semibold text-gray-900 mb-1.5">
                                    {isArabic ? 'ملاحظات وتوجيهات إدارة المبيعات:' : 'Official Sales & Commercial Notes:'}
                                </h4>
                                <p className="leading-relaxed whitespace-pre-wrap text-gray-600">{quotation.adminNotes}</p>
                            </div>
                        )}

                    </div>

                    {/* Right Column: Pricing Summary & Acceptance Form (5 cols) */}
                    <div className="lg:col-span-5 space-y-6 sticky top-24">
                        
                        {/* Financial Summary Card */}
                        <div className="bg-white rounded-xl p-6 border border-gray-200">
                            <h3 className="text-[15px] font-semibold text-gray-900 mb-4">
                                {isArabic ? 'الملخص المالي والضريبي' : 'Official Pricing Summary'}
                            </h3>

                            <div className="space-y-3 text-xs md:text-sm border-b border-gray-100 pb-4 mb-4">
                                <div className="flex justify-between text-gray-600">
                                    <span>{isArabic ? 'مجموع البنود:' : 'Items Subtotal:'}</span>
                                    <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                                </div>

                                {discountAmount > 0 && (
                                    <div className="flex justify-between text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded font-semibold text-xs">
                                        <span>{isArabic ? 'الخصم التجاري المعتمد:' : 'Approved Commercial Discount:'}</span>
                                        <span>-{formatPrice(discountAmount)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-gray-600">
                                    <span>{isArabic ? 'الشحن والتوصيل:' : 'Freight & Delivery:'}</span>
                                    <span className="font-medium text-gray-900">
                                        {shippingCost > 0 ? formatPrice(shippingCost) : (isArabic ? 'شحن مجاني' : 'Free Delivery')}
                                    </span>
                                </div>

                                <div className="flex justify-between text-gray-600">
                                    <span>{isArabic ? 'ضريبة القيمة المضافة (5% VAT):' : 'Estimated Tax (5% VAT):'}</span>
                                    <span className="font-medium text-gray-900">{formatPrice(taxAmount)}</span>
                                </div>
                            </div>

                            <div className="flex justify-between items-baseline mb-6">
                                <span className="text-sm font-semibold text-gray-900">
                                    {isArabic ? 'إجمالي العرض النهائي:' : 'Total Quoted Amount:'}
                                </span>
                                <span className="text-lg md:text-xl font-bold text-gray-900 font-mono">
                                    {formatPrice(totalAmount)}
                                </span>
                            </div>

                            {/* Acceptance Action Form */}
                            {isQuoted && !isAccepted && (
                                <>
                                    {!user ? (
                                        <div className="pt-4 border-t border-gray-100 space-y-3">
                                            <div>
                                                <h4 className="text-[13px] font-semibold text-gray-900 mb-1">
                                                    {isArabic ? 'تسجيل الدخول لتأكيد الطلب' : 'Sign in to confirm order'}
                                                </h4>
                                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                                    {isArabic 
                                                        ? 'يرجى تسجيل الدخول لربط هذا الطلب بحسابك التجاري ومتابعة التوريد.' 
                                                        : 'Sign in with your company account to confirm this quotation and track order fulfillment.'}
                                                </p>
                                            </div>

                                            <Link 
                                                href={`/login?redirect=/quotations/${quoteId}`}
                                                className="w-full bg-[#1a2b25] text-white py-3 px-4 rounded-md font-medium text-xs hover:bg-[#22322a] transition-all inline-flex items-center justify-center gap-1.5 shadow-sm"
                                            >
                                                <span>{isArabic ? 'تسجيل الدخول وتأكيد الطلب' : 'Sign in to accept quote'}</span>
                                                <ArrowUpRight size={14} />
                                            </Link>

                                            <p className="text-[11px] text-gray-500 text-center">
                                                {isArabic ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
                                                <Link 
                                                    href={`/register?redirect=/quotations/${quoteId}&email=${encodeURIComponent(quotation?.customerEmail || '')}&name=${encodeURIComponent(quotation?.customerName || '')}&phone=${encodeURIComponent(quotation?.customerPhone || '')}`} 
                                                    className="text-gray-900 font-medium hover:underline"
                                                >
                                                    {isArabic ? 'سجل هنا' : 'Register here'}
                                                </Link>
                                            </p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleAcceptQuotation} className="space-y-4 pt-2 border-t border-gray-100">
                                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                                                {isArabic ? 'طريقة السداد والتأكيد' : 'Select Settlement Method'}
                                            </h4>

                                            <div className="space-y-2 text-xs">
                                                {isCorporateUser && (
                                                    <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                                        selectedPaymentMethod === 'CREDIT_TERMS' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                                                    }`}>
                                                        <div className="flex items-center gap-2.5">
                                                            <input 
                                                                type="radio" 
                                                                name="paymentMethod" 
                                                                value="CREDIT_TERMS" 
                                                                checked={selectedPaymentMethod === 'CREDIT_TERMS'}
                                                                onChange={() => setSelectedPaymentMethod('CREDIT_TERMS')}
                                                                className="text-black"
                                                            />
                                                            <div>
                                                                <span className="font-semibold text-gray-900 block">Corporate Credit Line (Net 30)</span>
                                                                <span className="text-[10px] text-gray-500">
                                                                    Available: {formatPrice(user?.availableCredit || 0)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <CreditCard size={16} className="text-gray-500" />
                                                    </label>
                                                )}

                                                <label className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                                                    selectedPaymentMethod === 'BANK_TRANSFER' ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                                                }`}>
                                                    <div className="flex items-center gap-2.5">
                                                        <input 
                                                            type="radio" 
                                                            name="paymentMethod" 
                                                            value="BANK_TRANSFER" 
                                                            checked={selectedPaymentMethod === 'BANK_TRANSFER'}
                                                            onChange={() => setSelectedPaymentMethod('BANK_TRANSFER')}
                                                            className="text-black"
                                                        />
                                                        <div>
                                                            <span className="font-semibold text-gray-900 block">Direct Wire / Bank Transfer</span>
                                                            <span className="text-[10px] text-gray-500">Corporate invoice with IBAN details provided upon confirmation</span>
                                                        </div>
                                                    </div>
                                                    <Building2 size={16} className="text-gray-500" />
                                                </label>
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                                                    PO NUMBER / PROCUREMENT REFERENCE (OPTIONAL)
                                                </label>
                                                <input 
                                                    type="text" 
                                                    value={poNumber}
                                                    onChange={e => setPoNumber(e.target.value)}
                                                    placeholder="e.g. PO-2026-8812"
                                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs focus:bg-white focus:border-gray-400 focus:outline-none"
                                                />
                                            </div>

                                            <button 
                                                type="submit"
                                                disabled={isAccepting}
                                                className="w-full bg-[#1a2b25] text-white py-3.5 px-4 rounded-xl font-semibold text-xs uppercase tracking-wider hover:bg-[#22322a] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                                            >
                                                {isAccepting ? (
                                                    <>
                                                        <Loader2 size={16} className="animate-spin text-[#fbdc3c]" />
                                                        <span>Confirming Order...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Accept Quote & Place Order</span>
                                                        <ArrowUpRight size={15} />
                                                    </>
                                                )}
                                            </button>
                                        </form>
                                    )}
                                </>
                            )}

                            

                        </div>

                    </div>

                </div>

            </div>

            {/* Bottom Brand CTA */}
            <div className="mt-8">
                <ConnectCTA />
            </div>

        </div>
    );
}
