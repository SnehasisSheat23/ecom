"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { fetchOrdersApi, fetchOrderByIdApi } from '@/lib/api';
import { 
    Search, 
    Package, 
    Truck, 
    CheckCircle2, 
    Clock, 
    ChevronDown, 
    ChevronUp, 
    ShoppingBag, 
    RefreshCw, 
    Printer, 
    AlertCircle,
    ShieldCheck,
    LogIn,
    ArrowRight
} from 'lucide-react';
import { ArrowUpRightIcon } from 'lucide-animated';

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

export interface OrderRecord {
    id: string;
    orderNumber: string;
    status: string;
    currency: string;
    subtotal: number;
    shippingCost: number;
    taxAmount?: number;
    discountAmount?: number;
    totalAmount: number;
    total?: number;
    paymentMethodType?: string;
    paymentMethod?: string;
    poNumber?: string;
    createdAt: string;
    updatedAt?: string;
    items?: OrderItemRecord[];
}

const STATUS_STEPS = [
    { key: 'PENDING', labelEn: 'Order Placed', labelAr: 'تم استلام الطلب', icon: Clock },
    { key: 'CONFIRMED', labelEn: 'Confirmed', labelAr: 'تم التأكيد', icon: ShieldCheck },
    { key: 'PROCESSING', labelEn: 'In Packing', labelAr: 'قيد التجهيز', icon: Package },
    { key: 'SHIPPED', labelEn: 'Out for Delivery', labelAr: 'خرج للتوصيل', icon: Truck },
    { key: 'DELIVERED', labelEn: 'Delivered', labelAr: 'تم التوصيل', icon: CheckCircle2 },
];

function getStatusStepIndex(status: string): number {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED' || s === 'COMPLETED') return 4;
    if (s === 'SHIPPED' || s === 'IN_TRANSIT' || s === 'DISPATCHED' || s === 'OUT_FOR_DELIVERY') return 3;
    if (s === 'PROCESSING' || s === 'PAID' || s === 'PREPARING') return 2;
    if (s === 'CONFIRMED' || s === 'AUTHORIZED') return 1;
    return 0;
}

function getStatusBadgeClass(status: string): { bg: string; text: string; labelEn: string; labelAr: string } {
    const s = (status || '').toUpperCase();
    if (s === 'DELIVERED' || s === 'COMPLETED') {
        return { bg: 'bg-emerald-50 border-emerald-200/60', text: 'text-emerald-700', labelEn: 'Delivered', labelAr: 'تم التوصيل' };
    }
    if (s === 'SHIPPED' || s === 'IN_TRANSIT' || s === 'DISPATCHED' || s === 'OUT_FOR_DELIVERY') {
        return { bg: 'bg-blue-50 border-blue-200/60', text: 'text-blue-700', labelEn: 'Out for Delivery', labelAr: 'في الطريق' };
    }
    if (s === 'PROCESSING' || s === 'PAID' || s === 'PREPARING') {
        return { bg: 'bg-amber-50 border-amber-200/60', text: 'text-amber-800', labelEn: 'In Packing', labelAr: 'قيد التجهيز' };
    }
    if (s === 'CANCELLED') {
        return { bg: 'bg-red-50 border-red-200/60', text: 'text-red-700', labelEn: 'Cancelled', labelAr: 'ملغي' };
    }
    return { bg: 'bg-gray-50 border-gray-200/60', text: 'text-gray-700', labelEn: 'Order Placed', labelAr: 'قيد المراجعة' };
}

export default function TrackOrderPage() {
    const { user, accessToken, isAuthLoading, language, formatPrice } = useShop();
    const router = useRouter();
    const isArabic = language.startsWith('Arabic') || language === 'ar' || language === 'العربية';

    // Guest search inputs
    const [orderNumberInput, setOrderNumberInput] = useState('');
    const [emailInput, setEmailInput] = useState('');

    const [orders, setOrders] = useState<OrderRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Auto-fetch orders when user is logged in
    const loadLoggedInUserOrders = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setErrorMessage(null);
        try {
            const result = await fetchOrdersApi(
                {
                    customerId: user.id,
                    email: user.email,
                    limit: 50,
                },
                accessToken || undefined
            );

            const items: OrderRecord[] = result?.items || [];
            setOrders(items);
            if (items.length > 0) {
                setExpandedOrderId(items[0].id);
            }
        } catch (err: any) {
            console.error('Failed to load user orders:', err);
            setErrorMessage(isArabic ? 'فشل تحميل بيانات الطلبات. يرجى المحاولة مرة أخرى.' : 'Failed to load order tracking data. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [user, accessToken, isArabic]);

    useEffect(() => {
        if (!isAuthLoading) {
            if (user) {
                loadLoggedInUserOrders();
            } else {
                setOrders([]);
                setLoading(false);
            }
        }
    }, [isAuthLoading, user, loadLoggedInUserOrders]);

    // Handle Search for Guest Lookup
    const handleGuestSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedOrder = orderNumberInput.trim();
        const trimmedEmail = emailInput.trim();

        if (!trimmedOrder && !trimmedEmail && !user) {
            setErrorMessage(isArabic ? 'يرجى إدخال رقم الطلب للتتبع.' : 'Please enter an Order Number to track.');
            return;
        }

        setLoading(true);
        setErrorMessage(null);
        setHasSearched(true);

        try {
            let items: OrderRecord[] = [];

            if (trimmedOrder) {
                const directOrder = await fetchOrderByIdApi(trimmedOrder, accessToken || undefined);
                if (directOrder) {
                    items = [directOrder];
                }
            }

            if (items.length === 0) {
                const result = await fetchOrdersApi({
                    search: trimmedOrder || undefined,
                    email: trimmedEmail || undefined,
                    customerId: user?.id,
                    limit: 30,
                }, accessToken || undefined);

                items = result?.items || [];
            }

            setOrders(items);
            if (items.length > 0) {
                setExpandedOrderId(items[0].id);
            }
        } catch (err: any) {
            console.error('Track order lookup failed:', err);
            setErrorMessage(isArabic ? 'لم نتمكن من العثور على أي شحنة تطابق البيانات المدخلة.' : 'No shipment found matching the provided details.');
        } finally {
            setLoading(false);
        }
    };

    const toggleAccordion = async (id: string) => {
        if (expandedOrderId === id) {
            setExpandedOrderId(null);
            return;
        }

        setExpandedOrderId(id);

        // Dynamically fetch full order items if missing
        const targetOrder = orders.find(o => o.id === id);
        if (targetOrder && (!targetOrder.items || targetOrder.items.length === 0)) {
            try {
                const freshOrder = await fetchOrderByIdApi(id, accessToken || undefined);
                if (freshOrder && freshOrder.items) {
                    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...freshOrder } : o));
                }
            } catch (e) {
                console.warn('Failed to load itemized details for order:', id, e);
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#f8f9fa] text-black font-sans pb-28">
            
            {/* Header Section */}
            <div className="pt-20 pb-10 flex flex-col justify-center items-center px-4">
                <h1 className={`font-heading text-4xl md:text-6xl lg:text-7xl uppercase text-[#1a2b25] tracking-wider flex flex-wrap justify-center items-center gap-3 md:gap-4 text-center ${isArabic ? 'font-sans font-black tracking-tight' : ''}`}>
                    {isArabic ? 'تتبع' : 'TRACK'}
                    <span className="bg-[#fbdc3c] px-4 pt-2 pb-1 text-[#1a2b25] shadow-xs">
                        {isArabic ? 'الطلبات' : 'ORDERS'}
                    </span>
                </h1>
                <p className="text-gray-500 text-xs md:text-sm mt-3 max-w-lg text-center font-medium">
                    {user
                        ? (isArabic ? `مرحباً بك، ${user.name || user.email}. إليك نظرة عامة على شحناتك المباشرة.` : `Welcome back, ${user.name || user.email}. Here is your live order tracking overview.`)
                        : (isArabic ? 'تتبع طلبيتك برقم الطلب، أو سجل الدخول لعرض كافة طلباتك.' : 'Enter your Order Number below or sign in to view your orders.')}
                </p>
            </div>

            <div className="max-w-[860px] mx-auto px-4 space-y-5">
                
                {/* Guest Lookup Form (Only shown when not logged in) */}
                {!user && (
                    <div className="bg-white rounded-2xl p-6 sm:p-7 shadow-xs border border-gray-200/80">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100 mb-5">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    {isArabic ? 'تتبع طلب كزائر' : 'Guest Order Lookup'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {isArabic ? 'أدخل رقم الطلب الخاص بك لمتابعة الشحنة' : 'Enter your Order Number to view items and live status'}
                                </p>
                            </div>
                            <Link
                                href="/login?redirect=/track-order"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition-all shrink-0 self-start sm:self-center"
                            >
                                <LogIn size={13} />
                                <span>{isArabic ? 'تسجيل الدخول' : 'Sign In'}</span>
                            </Link>
                        </div>

                        <form onSubmit={handleGuestSearch} className="flex flex-col sm:flex-row gap-2.5">
                            <div className="relative flex-1">
                                <Package size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    required
                                    value={orderNumberInput}
                                    onChange={e => setOrderNumberInput(e.target.value)}
                                    placeholder={isArabic ? 'رقم الطلب (مثال: ORD-Q-20260819-7024)' : 'Order Number (e.g. ORD-Q-20260819-7024)'}
                                    className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[#1a2b25] hover:bg-black text-white font-semibold text-xs py-2.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
                            >
                                {loading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
                                <span>{isArabic ? 'تتبع الطلب' : 'Track Order'}</span>
                            </button>
                        </form>
                    </div>
                )}

                {/* Loading Skeleton */}
                {loading && (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2].map(n => (
                            <div key={n} className="bg-white rounded-2xl p-5 border border-gray-200 space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="space-y-1.5">
                                        <div className="h-4 w-36 bg-gray-200 rounded"></div>
                                        <div className="h-3 w-24 bg-gray-100 rounded"></div>
                                    </div>
                                    <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error Banner */}
                {errorMessage && !loading && (
                    <div className="bg-red-50 border border-red-200 text-red-900 rounded-2xl p-5 text-center">
                        <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold">{errorMessage}</p>
                    </div>
                )}

                {/* Empty State after Search */}
                {!loading && !errorMessage && (user || hasSearched) && orders.length === 0 && (
                    <div className="bg-white rounded-3xl p-10 text-center border border-gray-200/80 shadow-xs max-w-md mx-auto">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Package size={24} />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 mb-1.5">
                            {isArabic ? 'لم يتم العثور على أي طلبات' : 'No Orders Found'}
                        </h3>
                        <p className="text-xs text-gray-500 mb-5 leading-relaxed">
                            {orderNumberInput
                                ? (isArabic ? `لم نجد أي طلب يطابق "${orderNumberInput}".` : `No orders matched "${orderNumberInput}".`)
                                : (isArabic ? 'ليس لديك طلبات سابقة مسجلة في هذا الحساب حالياً.' : 'You have no orders placed under this account yet.')}
                        </p>
                        <Link
                            href="/products"
                            className="bg-[#1a2b25] hover:bg-black text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-colors inline-flex items-center justify-center gap-1.5"
                        >
                            <span>{isArabic ? 'تصفح المنتجات' : 'Browse Store'}</span>
                            <ArrowUpRightIcon size={13} className="text-[#fbdc3c]" />
                        </Link>
                    </div>
                )}

                {/* Orders Accordion List */}
                {!loading && !errorMessage && orders.length > 0 && (
                    <div className="space-y-3.5">
                        <div className="flex justify-between items-center px-1">
                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                                {isArabic 
                                    ? `الطلبات (${orders.length})` 
                                    : `Orders (${orders.length})`}
                            </p>
                            {user && (
                                <button
                                    onClick={() => loadLoggedInUserOrders()}
                                    className="text-xs text-gray-500 hover:text-black font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                >
                                    <RefreshCw size={11} />
                                    <span>{isArabic ? 'تحديث' : 'Refresh'}</span>
                                </button>
                            )}
                        </div>

                        {orders.map((order) => {
                            const isExpanded = expandedOrderId === order.id;
                            const badge = getStatusBadgeClass(order.status);
                            const currentStepIdx = getStatusStepIndex(order.status);
                            const orderDate = new Date(order.createdAt).toLocaleDateString(isArabic ? 'ar-SA' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            });

                            const itemsList = order.items || [];
                            const itemsCount = itemsList.reduce((sum, it) => sum + (it.quantity || it.qty || 1), 0) || itemsList.length;
                            
                            // Extract actual first item image for accordion thumbnail
                            const firstItemImg = itemsList[0]?.image || itemsList[0]?.imageUrl ||
                                (typeof itemsList[0]?.productNameSnapshot === 'object' ? itemsList[0]?.productNameSnapshot?.imageUrl || itemsList[0]?.productNameSnapshot?.image : null) || 
                                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';

                            const targetDetailsUrl = `/orders/${encodeURIComponent(order.orderNumber || order.id)}`;

                            return (
                                <div 
                                    key={order.id} 
                                    className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden ${
                                        isExpanded ? 'border-gray-300 shadow-xs' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    {/* Accordion Summary Header */}
                                    <button
                                        type="button"
                                        onClick={() => toggleAccordion(order.id)}
                                        className="w-full p-4 sm:p-5 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-gray-50/40 transition-colors"
                                    >
                                        {/* Left: Product Thumbnail Image + Order Info */}
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center p-1">
                                                <img 
                                                    src={firstItemImg} 
                                                    alt="Order Item" 
                                                    className="w-full h-full object-contain"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <span className="font-mono font-bold text-sm sm:text-base text-gray-900 block leading-snug">
                                                    {order.orderNumber || order.id}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5 font-normal">
                                                    <span>{orderDate}</span>
                                                    <span>•</span>
                                                    <span>{itemsCount} {itemsCount === 1 ? (isArabic ? 'صنف' : 'Item') : (isArabic ? 'أصناف' : 'Items')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right: Subtle Status Pill, Total Price, & Chevron */}
                                        <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2.5 sm:pt-0 border-gray-100">
                                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${badge.bg} ${badge.text}`}>
                                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                                {isArabic ? badge.labelAr : badge.labelEn}
                                            </span>

                                            <div className="text-right">
                                                <p className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">
                                                    {isArabic ? 'الإجمالي' : 'Total'}
                                                </p>
                                                <p className="text-sm sm:text-base font-bold text-gray-900 font-mono">
                                                    {formatPrice(order.totalAmount || order.total || 0)}
                                                </p>
                                            </div>

                                            <div className="w-7 h-7 rounded-full bg-gray-100/80 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors shrink-0">
                                                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                            </div>
                                        </div>
                                    </button>

                                    {/* Accordion Expanded Body */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100 bg-[#fdfdfd] p-4 sm:p-6 space-y-5 animate-in fade-in duration-150">
                                            
                                            {/* 1. Subtle Visual Progress Dispatch Tracker */}
                                            <div className="py-2 px-1">
                                                <div className="relative">
                                                    {/* Progress Line */}
                                                    <div className="hidden sm:block absolute top-3.5 left-6 right-6 h-0.5 bg-gray-200 -z-0">
                                                        <div 
                                                            className="h-full bg-gray-800 transition-all duration-500"
                                                            style={{ width: `${(currentStepIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
                                                        />
                                                    </div>

                                                    {/* Steps */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 relative z-10">
                                                        {STATUS_STEPS.map((step, idx) => {
                                                            const isCompleted = idx <= currentStepIdx;
                                                            const isCurrent = idx === currentStepIdx;
                                                            const IconComp = step.icon;

                                                            return (
                                                                <div key={step.key} className="flex sm:flex-col items-center gap-2 sm:text-center">
                                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                                                        isCurrent 
                                                                            ? 'bg-[#1a2b25] text-[#fbdc3c] shadow-xs' 
                                                                            : (isCompleted ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-400')
                                                                    }`}>
                                                                        <IconComp size={13} />
                                                                    </div>
                                                                    <p className={`text-[11px] font-medium leading-tight ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                                                        {isArabic ? step.labelAr : step.labelEn}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* 2. Items List (Minimal without heavy nested card) */}
                                            <div className="pt-3 border-t border-gray-100 space-y-3">
                                                <div className="flex justify-between items-center">
                                                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                                                        <ShoppingBag size={12} />
                                                        {isArabic ? 'المنتجات المطلوبة' : 'Order Items'}
                                                    </h4>
                                                    <span className="text-[11px] text-gray-400">
                                                        {itemsList.length} {isArabic ? 'منتجات' : 'Products'}
                                                    </span>
                                                </div>

                                                <div className="divide-y divide-gray-100">
                                                    {itemsList.map((item, iIdx) => {
                                                        const itemTitle = item.productTitle || item.name || (typeof item.productNameSnapshot === 'string' ? item.productNameSnapshot : item.productNameSnapshot?.en || item.productNameSnapshot?.title || item.sku || 'Product Item');
                                                        const itemImg = item.imageUrl || item.image || (typeof item.productNameSnapshot === 'object' ? item.productNameSnapshot?.imageUrl || item.productNameSnapshot?.image : null) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
                                                        const unitPrice = Number(item.unitPrice || item.price || 0);
                                                        const qty = item.quantity || item.qty || 1;
                                                        const lineTotal = unitPrice * qty;

                                                        return (
                                                            <div key={item.id || iIdx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg p-0.5 shrink-0 flex items-center justify-center overflow-hidden">
                                                                        <img 
                                                                            src={itemImg} 
                                                                            alt={itemTitle} 
                                                                            className="w-full h-full object-contain"
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop&q=80';
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h5 className="text-xs font-semibold text-gray-900 truncate">
                                                                            {itemTitle}
                                                                        </h5>
                                                                        <p className="text-[11px] text-gray-400 mt-0.5">
                                                                            Qty: {qty} × {formatPrice(unitPrice)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <span className="text-xs font-mono font-medium text-gray-900">
                                                                        {formatPrice(lineTotal)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Price Totals Summary */}
                                                <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs">
                                                    <div className="flex justify-between text-gray-500">
                                                        <span>{isArabic ? 'المجموع الفرعي' : 'Subtotal'}</span>
                                                        <span className="font-mono text-gray-800">{formatPrice(order.subtotal || order.totalAmount || 0)}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-500">
                                                        <span>{isArabic ? 'الشحن' : 'Shipping'}</span>
                                                        <span className="font-mono text-emerald-700">{Number(order.shippingCost || 0) > 0 ? formatPrice(order.shippingCost) : 'Free'}</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-900 font-bold text-sm pt-2 border-t border-gray-100">
                                                        <span>{isArabic ? 'المجموع الكلي' : 'Total'}</span>
                                                        <span className="font-mono font-bold text-gray-900">{formatPrice(order.totalAmount || order.total || 0)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons: Subtle Harmonious Layout */}
                                            <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
                                                <button
                                                    onClick={() => window.print()}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200/80 rounded-lg text-xs font-medium text-gray-700 transition-colors cursor-pointer"
                                                >
                                                    <Printer size={13} />
                                                    <span>{isArabic ? 'طباعة' : 'Quick Print'}</span>
                                                </button>

                                                <Link
                                                    href={targetDetailsUrl}
                                                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#1a2b25] hover:bg-black text-white hover:text-[#fbdc3c] rounded-lg text-xs font-semibold transition-all shadow-xs"
                                                >
                                                    <span>{isArabic ? 'عرض التفاصيل الكاملة' : 'View Full Order Details'}</span>
                                                    <ArrowRight size={13} />
                                                </Link>
                                            </div>

                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
        </div>
    );
}
