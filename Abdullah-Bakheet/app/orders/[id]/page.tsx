"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { fetchOrderByIdApi } from '@/lib/api';
import { 
    ChevronLeft, 
    Printer, 
    Truck, 
    Package, 
    Clock, 
    ShieldCheck, 
    CheckCircle2, 
    Building2, 
    CreditCard, 
    MapPin, 
    ShoppingBag, 
    AlertCircle, 
    Paperclip,
    ArrowUpRight
} from 'lucide-react';

export interface OrderItemRecord {
    id?: string;
    productId?: string;
    productNameSnapshot?: any;
    name?: string;
    productTitle?: string;
    image?: string;
    imageUrl?: string;
    sku?: string;
    quantity: number;
    qty?: number;
    unitPrice: number;
    totalPrice?: number;
    price?: number;
}

export interface OrderDetail {
    id: string;
    orderNumber: string;
    status: string;
    currency: string;
    subtotal: number;
    shippingCost: number;
    shippingAmount?: number;
    taxAmount?: number;
    discountAmount?: number;
    totalAmount: number;
    total?: number;
    paymentMethodType?: string;
    paymentMethod?: string;
    poNumber?: string;
    poDocumentUrl?: string;
    paymentReceiptUrl?: string;
    quotationId?: string;
    shippingAddressSnapshot?: {
        name?: string;
        fullName?: string;
        recipientName?: string;
        company?: string;
        taxNumber?: string;
        email?: string;
        phone?: string;
        line1?: string;
        line2?: string;
        address?: string;
        deliverySite?: string;
        city?: string;
        state?: string;
        postalCode?: string;
        pincode?: string;
        country?: string;
        notes?: string;
        schedule?: string;
    };
    customer?: {
        id?: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        companyName?: string;
        companyTaxId?: string;
        crNumber?: string;
    };
    customerRecord?: {
        id?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        phone?: string;
        companyName?: string;
        companyTaxId?: string;
        crNumber?: string;
    };
    createdAt: string;
    updatedAt?: string;
    items?: OrderItemRecord[];
}

function getStatusDetails(status: string) {
    const s = (status || '').toUpperCase();
    switch (s) {
        case 'PENDING_PAYMENT':
            return {
                titleEn: 'Payment Pending',
                titleAr: 'في انتظار الدفع',
                descEn: 'Awaiting wire transfer slip or invoice settlement',
                descAr: 'بانتظار إشعار التحويل البنكي أو تسوية الفاتورة',
                barWidth: 'w-[20%]',
                barColor: 'bg-amber-500',
                badgeBg: 'bg-amber-100 border-amber-300 text-amber-900',
            };
        case 'PENDING':
            return {
                titleEn: 'Order Placed',
                titleAr: 'تم استلام الطلب',
                descEn: 'Awaiting confirmation and allocation',
                descAr: 'بانتظار التأكيد وتخصيص البضاعة',
                barWidth: 'w-[25%]',
                barColor: 'bg-[#1a2b25]',
                badgeBg: 'bg-gray-100 border-gray-300 text-gray-800',
            };
        case 'CONFIRMED':
            return {
                titleEn: 'Confirmed',
                titleAr: 'تم تأكيد الطلب',
                descEn: 'Order confirmed and ready for warehouse packing',
                descAr: 'تم التأكيد وجاهز للتجهيز في المستودع',
                barWidth: 'w-[50%]',
                barColor: 'bg-[#1a2b25]',
                badgeBg: 'bg-emerald-100 border-emerald-300 text-emerald-800',
            };
        case 'PROCESSING':
            return {
                titleEn: 'Processing / In Packing',
                titleAr: 'جاري التجهيز والتعبئة',
                descEn: 'Being prepared and boxed for shipment',
                descAr: 'جاري التجهيز والتعبئة في المستودع الرئيسي',
                barWidth: 'w-[70%]',
                barColor: 'bg-blue-600',
                badgeBg: 'bg-blue-100 border-blue-300 text-blue-800',
            };
        case 'SHIPPED':
        case 'IN_TRANSIT':
        case 'DISPATCHED':
        case 'OUT_FOR_DELIVERY':
            return {
                titleEn: 'Out for Delivery',
                titleAr: 'خرج للتوصيل',
                descEn: 'Shipment is on the route to destination',
                descAr: 'الشحنة في طريقها إلى موقع التوصيل',
                barWidth: 'w-[85%]',
                barColor: 'bg-amber-500',
                badgeBg: 'bg-blue-100 border-blue-300 text-blue-800',
            };
        case 'DELIVERED':
        case 'COMPLETED':
            return {
                titleEn: 'Delivered',
                titleAr: 'تم التوصيل بنجاح',
                descEn: 'Successfully delivered to customer site',
                descAr: 'تم تسليم الشحنة بنجاح في الموقع المحدد',
                barWidth: 'w-full',
                barColor: 'bg-emerald-500',
                badgeBg: 'bg-emerald-100 border-emerald-300 text-emerald-800',
            };
        case 'CANCELLED':
            return {
                titleEn: 'Cancelled',
                titleAr: 'ملغي',
                descEn: 'This order was cancelled',
                descAr: 'تم إلغاء هذا الطلب',
                barWidth: 'w-full',
                barColor: 'bg-red-400',
                badgeBg: 'bg-red-100 border-red-300 text-red-800',
            };
        default:
            return {
                titleEn: 'Order Processing',
                titleAr: 'قيد المعالجة',
                descEn: 'Processing order details',
                descAr: 'جاري معالجة تفاصيل الطلب',
                barWidth: 'w-[30%]',
                barColor: 'bg-[#1a2b25]',
                badgeBg: 'bg-gray-100 border-gray-300 text-gray-800',
            };
    }
}

export default function OrderDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { accessToken, formatPrice, language } = useShop();
    const isArabic = language.startsWith('Arabic') || language === 'ar' || language === 'العربية';

    const orderIdOrNumber = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!orderIdOrNumber) return;

        setLoading(true);
        setErrorMessage(null);

        fetchOrderByIdApi(orderIdOrNumber, accessToken || undefined)
            .then(data => {
                if (data) {
                    setOrder(data);
                } else {
                    setErrorMessage(isArabic ? 'لم نتمكن من العثور على هذا الطلب.' : 'Order details not found.');
                }
            })
            .catch(err => {
                console.error('Failed to load order:', err);
                setErrorMessage(isArabic ? 'حدث خطأ أثناء تحميل بيانات الطلب.' : 'Failed to load order details.');
            })
            .finally(() => {
                setLoading(false);
            });
    }, [orderIdOrNumber, accessToken, isArabic]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f8f9fa] py-12 px-4 sm:px-6 lg:px-8 font-sans">
                <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
                    <div className="h-6 w-32 bg-gray-200 rounded"></div>
                    <div className="h-28 bg-white border border-gray-200 rounded-2xl p-6"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-7 h-80 bg-white border border-gray-200 rounded-2xl"></div>
                        <div className="lg:col-span-5 h-80 bg-white border border-gray-200 rounded-2xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (errorMessage || !order) {
        return (
            <div className="min-h-screen bg-[#f8f9fa] py-20 px-4 font-sans flex items-center justify-center">
                <div className="bg-white rounded-3xl p-8 sm:p-12 text-center max-w-md w-full border border-gray-200 shadow-xs space-y-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                    <h2 className="text-xl font-bold text-gray-900">{isArabic ? 'الطلب غير موجود' : 'Order Not Found'}</h2>
                    <p className="text-xs text-gray-500">{errorMessage || (isArabic ? 'تعذر العثور على الطلب المحدد.' : 'The requested order could not be located.')}</p>
                    <Link
                        href="/track-order"
                        className="inline-flex items-center gap-2 bg-[#1a2b25] text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase hover:bg-black transition-colors"
                    >
                        <ChevronLeft size={16} />
                        <span>{isArabic ? 'العودة لصفحة التتبع' : 'Back to Tracking'}</span>
                    </Link>
                </div>
            </div>
        );
    }

    const statusInfo = getStatusDetails(order.status);
    const orderDate = new Date(order.createdAt).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const itemsList = order.items || [];
    const totalUnits = itemsList.reduce((sum, it) => sum + (it.quantity || it.qty || 1), 0) || itemsList.length;

    // Customer and address resolution
    const addr = order.shippingAddressSnapshot || {};
    const cust: any = order.customer || order.customerRecord || {};
    const contactName = addr.fullName || addr.name || addr.recipientName || [cust.firstName, cust.lastName].filter(Boolean).join(' ') || cust.name || 'Valued Client';
    const contactEmail = addr.email || cust.email || 'client@example.com';
    const contactPhone = addr.phone || cust.phone || null;

    const companyName = addr.company || cust.companyName || 'Individual / Retail';
    const taxId = addr.taxNumber || cust.companyTaxId || cust.crNumber || null;

    const deliveryDestination = addr.deliverySite || addr.line1 || addr.address || (companyName !== 'Individual / Retail' ? `Company Facility: ${companyName}` : 'Commercial Delivery Site');
    const cityCountry = [addr.city, addr.state, addr.postalCode || addr.pincode, addr.country].filter(Boolean).join(', ');

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-black font-sans pb-28">
            
            {/* Top Navigation Bar */}
            <div className="bg-white border-b border-gray-200/80 sticky top-0 z-30 shadow-2xs">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                    <button
                        onClick={() => router.push('/track-order')}
                        className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-black transition-colors cursor-pointer"
                    >
                        <ChevronLeft size={16} />
                        <span>{isArabic ? 'العودة لصفحة التتبع' : 'Back to Orders List'}</span>
                    </button>

                    <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.badgeBg}`}>
                            <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                            {isArabic ? statusInfo.titleAr : statusInfo.titleEn}
                        </span>

                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1a2b25] hover:bg-black text-[#fbdc3c] rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                        >
                            <Printer size={13} />
                            <span>{isArabic ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
                
                {/* Header Title Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl sm:text-3xl font-black font-mono text-gray-900 tracking-tight">
                                {order.orderNumber || order.id}
                            </h1>
                            {order.paymentMethodType === 'CREDIT_TERMS' && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded uppercase">
                                    <Building2 size={11} />
                                    Corporate Net 30
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                            {isArabic ? `تم استلام الطلب في ${orderDate}` : `Placed on ${orderDate} • ${totalUnits} total items`}
                        </p>
                    </div>
                </div>

                {/* 1. Status & Dispatch Block */}
                <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="text-base font-bold text-gray-900">
                                {isArabic ? statusInfo.titleAr : statusInfo.titleEn}
                            </h3>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">
                                Standard Regional Delivery
                            </p>
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                            {orderDate}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2.5 w-full max-w-[320px] bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${statusInfo.barColor} ${statusInfo.barWidth} transition-all duration-500`} />
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
                            <Truck size={16} />
                        </div>
                        <p className="text-xs text-gray-600 font-medium">
                            {isArabic ? statusInfo.descAr : statusInfo.descEn}
                        </p>
                    </div>
                </div>

                {/* 2. Main Two-Column Business Details */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column: Customer & Delivery Details (7 Cols) */}
                    <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-6">
                        <div className="pb-3 border-b border-gray-100">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                                {isArabic ? 'بيانات العميل والتوصيل' : 'Customer & Delivery Details'}
                            </h4>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                            {/* Contact Person */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">
                                    {isArabic ? 'جهة الاتصال' : 'Contact Person'}
                                </span>
                                <p className="font-bold text-gray-900 text-sm">{contactName}</p>
                                <p className="text-gray-600">{contactEmail}</p>
                                {contactPhone && <p className="font-mono text-gray-500 pt-0.5">{contactPhone}</p>}
                            </div>

                            {/* Company & Invoicing */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">
                                    {isArabic ? 'الشركة والفوترة' : 'Company & Invoicing'}
                                </span>
                                <p className="font-bold text-gray-900 text-sm">{companyName}</p>
                                {taxId && <p className="font-mono text-gray-500 text-[11px]">TRN: {taxId}</p>}
                            </div>

                            {/* Payment Method & Terms */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">
                                    {isArabic ? 'طريقة وشروط السداد' : 'Payment Method & Terms'}
                                </span>
                                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                    <span className="inline-block bg-gray-100 text-gray-900 font-bold px-2 py-0.5 rounded text-[11px] uppercase font-mono">
                                        {order.paymentMethodType || order.paymentMethod || 'BANK_TRANSFER'}
                                    </span>
                                    {order.poNumber && (
                                        <span className="font-mono text-emerald-800 font-bold text-[11px]">
                                            PO: {order.poNumber}
                                        </span>
                                    )}
                                </div>
                                {order.quotationId && (
                                    <p className="text-[11px] text-gray-400 font-medium mt-1">
                                        Origin: RFQ Quotation
                                    </p>
                                )}
                                {order.poDocumentUrl && (
                                    <a 
                                        href={order.poDocumentUrl} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-[11px] text-blue-600 hover:underline inline-flex items-center gap-1 mt-1 font-medium"
                                    >
                                        <Paperclip size={12} />
                                        View Attached PO
                                    </a>
                                )}
                            </div>

                            {/* Shipping Method */}
                            <div className="space-y-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">
                                    {isArabic ? 'طريقة الشحن' : 'Shipping Method'}
                                </span>
                                <p className="font-semibold text-gray-900">Standard Delivery</p>
                                {addr.schedule && (
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        Schedule: {addr.schedule}
                                    </p>
                                )}
                            </div>

                            {/* Delivery Destination */}
                            <div className="sm:col-span-2 pt-3 border-t border-gray-100 space-y-1">
                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wide block">
                                    {isArabic ? 'موقع ووجهة التوصيل' : 'Delivery Destination / Site'}
                                </span>
                                <p className="font-semibold text-gray-900 leading-relaxed text-sm">{deliveryDestination}</p>
                                {cityCountry && (
                                    <p className="text-gray-500 text-xs">{cityCountry}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Order Summary & Itemized List (5 Cols) */}
                    <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-gray-200/80 shadow-xs space-y-5">
                        <div className="pb-3 border-b border-gray-100">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900">
                                {isArabic ? 'ملخص الطلب' : 'Order Summary'}
                            </h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                                Items and price totals
                            </p>
                        </div>

                        {/* Itemized List */}
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto pr-1">
                            {itemsList.map((item, idx) => {
                                const itemTitle = item.productTitle || item.name || (typeof item.productNameSnapshot === 'string' ? item.productNameSnapshot : item.productNameSnapshot?.en || item.productNameSnapshot?.title || item.sku || 'Product Item');
                                const itemImg = item.imageUrl || item.image || (typeof item.productNameSnapshot === 'object' ? item.productNameSnapshot?.imageUrl || item.productNameSnapshot?.image : null) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
                                const unitP = Number(item.unitPrice || item.price || 0);
                                const qty = item.quantity || item.qty || 1;
                                const lineTot = unitP * qty;

                                return (
                                    <div key={item.id || idx} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Image with Qty Badge */}
                                            <div className="relative shrink-0">
                                                <div className="w-13 h-13 bg-gray-50 border border-gray-200/80 rounded-xl p-1 flex items-center justify-center overflow-hidden">
                                                    <img 
                                                        src={itemImg} 
                                                        alt={itemTitle} 
                                                        className="w-full h-full object-contain"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
                                                        }}
                                                    />
                                                </div>
                                                <span className="absolute -top-1.5 -right-1.5 bg-[#1a2b25] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                                                    {qty}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="text-xs font-semibold text-gray-900 leading-snug line-clamp-1">
                                                    {itemTitle}
                                                </h5>
                                                {item.sku && (
                                                    <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                                                        SKU: {item.sku}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-mono font-medium text-gray-900">
                                                {formatPrice(lineTot)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Price Totals */}
                        <div className="pt-4 border-t border-gray-100 space-y-2 text-xs">
                            <div className="flex justify-between text-gray-500">
                                <span>Subtotal • {totalUnits} items</span>
                                <span className="font-mono font-medium text-gray-900">{formatPrice(order.subtotal || order.totalAmount || 0)}</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                                <span>Shipping</span>
                                <span className="font-mono font-medium text-emerald-700">
                                    {Number(order.shippingCost || order.shippingAmount || 0) > 0 
                                        ? formatPrice(Number(order.shippingCost || order.shippingAmount || 0)) 
                                        : 'Free'}
                                </span>
                            </div>
                            {Number(order.discountAmount || 0) > 0 && (
                                <div className="flex justify-between text-emerald-700 font-mono">
                                    <span>Discount</span>
                                    <span>-{formatPrice(Number(order.discountAmount))}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-2 border-t border-gray-100 text-sm font-bold text-gray-900">
                                <span>Total</span>
                                <span className="font-mono text-lg font-black text-gray-900">
                                    {formatPrice(order.totalAmount || order.total || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
