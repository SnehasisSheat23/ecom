"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { createQuotationRequestApi } from '@/lib/api';
import { ArrowLeft, ArrowUpRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import ConnectCTA from '@/components/ConnectCTA';

export default function RfqRequestPage() {
    const { cart, clearCart, user, isCorporateUser, currency, formatPrice, language, accessToken } = useShop();
    const router = useRouter();
    const isArabic = language.startsWith('Arabic') || language === 'ar' || language === 'العربية';

    // -------------------------------------------------------------
    // Business Form State
    // -------------------------------------------------------------
    const [companyName, setCompanyName] = useState(user?.companyName || '');
    const [taxNumber, setTaxNumber] = useState(user?.companyTaxId || user?.crNumber || '');
    const [contactName, setContactName] = useState(user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim());
    const [contactEmail, setContactEmail] = useState(user?.email || '');
    const [contactPhone, setContactPhone] = useState(user?.phone || '');
    const [deliverySite, setDeliverySite] = useState('');
    const [expectedTimeline, setExpectedTimeline] = useState('Standard (3-5 business days)');
    const [targetOverallBudget, setTargetOverallBudget] = useState('');
    const [notes, setNotes] = useState('');

    // Per-item target prices (item.id -> custom target price string)
    const [targetUnitPrices, setTargetUnitPrices] = useState<Record<string, string>>({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [submittedQuote, setSubmittedQuote] = useState<any | null>(null);

    // -------------------------------------------------------------
    // Financial Computations
    // -------------------------------------------------------------
    const totalCartUnits = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const estimatedSubtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const buyerTargetSubtotal = cart.reduce((sum, item) => {
        const customTarget = parseFloat(targetUnitPrices[item.id] || '');
        const unitRate = (!isNaN(customTarget) && customTarget > 0) ? customTarget : item.price;
        return sum + (unitRate * item.quantity);
    }, 0);

    const overallSavingsTarget = Math.max(0, estimatedSubtotal - buyerTargetSubtotal);
    const savingsPercent = estimatedSubtotal > 0 ? ((overallSavingsTarget / estimatedSubtotal) * 100).toFixed(1) : '0';

    const handleTargetPriceChange = (itemId: string, val: string) => {
        setTargetUnitPrices(prev => ({
            ...prev,
            [itemId]: val
        }));
    };

    // -------------------------------------------------------------
    // Form Submit Handler
    // -------------------------------------------------------------
    const handleSubmitRfq = async (e: React.FormEvent) => {
        e.preventDefault();
        if (cart.length === 0) {
            setErrorMessage(isArabic ? 'السلة فارغة. يرجى إضافة منتجات أولاً.' : 'Cart is empty. Please add products before requesting a quote.');
            return;
        }

        if (!contactEmail || !contactName) {
            setErrorMessage(isArabic ? 'يرجى إدخال اسم المسؤول والبريد الإلكتروني.' : 'Please provide contact name and email address.');
            return;
        }

        if (!companyName) {
            setErrorMessage(isArabic ? 'يرجى إدخال اسم الشركة أو المؤسسة.' : 'Please provide Company / Organization name.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            const quotationItems = cart.map(item => {
                const customTarget = parseFloat(targetUnitPrices[item.id] || '');
                const targetRate = (!isNaN(customTarget) && customTarget > 0) ? customTarget : undefined;
                return {
                    productId: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    targetUnitPrice: targetRate,
                    image: item.image,
                };
            });

            const targetSummaryLines = cart.map(item => {
                const customTarget = targetUnitPrices[item.id];
                if (customTarget && parseFloat(customTarget) > 0) {
                    return `• ${item.name} (${item.quantity} units): Target ${customTarget} ${currency}/unit (Catalog: ${item.price} ${currency}/unit)`;
                }
                return null;
            }).filter(Boolean);

            const combinedNotes = [
                deliverySite ? `Delivery Site: ${deliverySite}` : '',
                expectedTimeline ? `Required Delivery Schedule: ${expectedTimeline}` : '',
                targetOverallBudget ? `🎯 Target Overall Contract Budget: ${targetOverallBudget} ${currency}` : '',
                targetSummaryLines.length > 0 ? `🎯 Buyer Target Line Pricing:\n${targetSummaryLines.join('\n')}` : '',
                notes ? `Client Project Specifications: ${notes}` : '',
            ].filter(Boolean).join('\n\n');

            const payload = {
                customerId: user?.id,
                customerName: contactName,
                customerEmail: contactEmail,
                customerPhone: contactPhone,
                companyName: companyName || (isCorporateUser ? user?.companyName : 'Commercial Buyer'),
                taxNumber: taxNumber || undefined,
                currency: currency || 'AED',
                customerNotes: combinedNotes,
                items: quotationItems,
            };

            const created = await createQuotationRequestApi(payload, accessToken || undefined);
            
            clearCart();
            setSubmittedQuote(created);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to submit quotation request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col w-full bg-white min-h-screen font-sans text-gray-900 pb-20">
            
            {/* Header Area */}
            <div className="pt-24 pb-6 max-w-[1200px] mx-auto w-full px-4 border-b border-gray-100">
                <Link href="/cart" className="inline-flex items-center gap-2 text-xs text-gray-500 hover:text-black mb-3 transition-colors font-medium">
                    <ArrowLeft size={14} className={isArabic ? 'rotate-180' : ''} />
                    <span>{isArabic ? 'العودة إلى سلة المشتريات' : 'Back to Cart'}</span>
                </Link>
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-heading text-black uppercase tracking-wide">
                            {isArabic ? 'طلب عرض سعر تجاري' : 'Wholesale Quotation Request'}
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            {isArabic 
                                ? 'حدد الكميات والأسعار المستهدفة للحصول على تسعير خاص من إدارة المبيعات.'
                                : 'Review items, enter target rates if needed, and submit for commercial review.'}
                        </p>
                    </div>
                    <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-3 py-1.5 rounded border border-gray-200">
                        {totalCartUnits} {isArabic ? 'إجمالي الوحدات' : 'Total Units'}
                    </span>
                </div>
            </div>

            {/* Main Seamless Content Area */}
            <div className="px-4 py-8 w-full max-w-[1200px] mx-auto flex-1">
                
                {submittedQuote ? (
                    /* Success Confirmation Screen */
                    <div className="py-12 text-center max-w-xl mx-auto">
                        <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-emerald-200">
                            <CheckCircle2 size={30} className="text-emerald-600" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                            {isArabic ? 'تم استلام طلب عرض السعر' : 'Quotation Request Received'}
                        </h2>
                        <p className="text-gray-600 text-xs md:text-sm mb-6 leading-relaxed">
                            {isArabic 
                                ? `تم تسجيل طلبكم برقم مرجعي: ${submittedQuote.quotationNumber || submittedQuote.id}. يقوم فريق المبيعات بمراجعة الأسعار وإرسال العرض المعتمد.`
                                : `Your request has been submitted under Reference: ${submittedQuote.quotationNumber || submittedQuote.id}. Our commercial sales team is reviewing your quantities and target rates.`}
                        </p>
                        
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left text-xs text-gray-800 space-y-2">
                            <div className="flex justify-between font-semibold">
                                <span>{isArabic ? 'رقم عرض السعر:' : 'Quotation Reference:'}</span>
                                <span className="font-mono text-gray-900">{submittedQuote.quotationNumber || submittedQuote.id}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>{isArabic ? 'الحالة:' : 'Status:'}</span>
                                <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                                    {isArabic ? 'قيد المراجعة' : 'Under Review & Pricing'}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>{isArabic ? 'عدد الوحدات:' : 'Total Units:'}</span>
                                <span>{totalCartUnits || submittedQuote.totalQuantity || '-'} units</span>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Link 
                                href={`/quotations/${submittedQuote.id}`}
                                className="bg-[#1a2b25] text-white px-6 py-3 rounded-lg font-semibold text-xs hover:bg-[#22322a] transition-colors flex items-center justify-center gap-2"
                            >
                                <span>{isArabic ? 'متابعة عرض السعر' : 'View & Track Quotation'}</span>
                                <ArrowUpRight size={14} />
                            </Link>
                            <Link 
                                href="/products"
                                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold text-xs hover:bg-gray-200 transition-colors"
                            >
                                {isArabic ? 'تصفح المنتجات' : 'Browse Catalog'}
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Main RFQ Form */
                    <form onSubmit={handleSubmitRfq} className="space-y-10">
                        
                        {errorMessage && (
                            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-lg text-xs flex items-center gap-2.5">
                                <AlertCircle size={16} className="shrink-0 text-red-600" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        {/* ========================================================= */}
                        {/* SECTION 1: LINE ITEMS & PROPOSED TARGET RATES */}
                        {/* ========================================================= */}
                        <div className="pb-8 border-b border-gray-200">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-2">
                                <h2 className="text-[16px] md:text-[17px] font-semibold text-gray-900">
                                    {isArabic ? 'المنتجات المطلوبة والأسعار المستهدفة' : 'Quotation Line Items & Target Rates'}
                                </h2>
                                <span className="text-xs text-gray-500 font-medium">
                                    {cart.length} {isArabic ? 'عناصر' : 'Items'} ({totalCartUnits} units)
                                </span>
                            </div>

                            {/* Line Items Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs md:text-sm border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-200 text-gray-400 font-bold uppercase text-[11px] tracking-wider pb-3">
                                            <th className="py-3 px-1">{isArabic ? 'المنتج' : 'Product Item'}</th>
                                            <th className="py-3 px-3 text-center">{isArabic ? 'الكمية' : 'Quantity'}</th>
                                            <th className="py-3 px-3 text-right">{isArabic ? 'سعر الكتالوج' : 'Catalog Price'}</th>
                                            <th className="py-3 px-3 text-center">{isArabic ? 'السعر المستهدف' : 'Target Unit Price'}</th>
                                            <th className="py-3 px-1 text-right">{isArabic ? 'إجمالي السعر المستهدف' : 'Target Line Total'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {cart.map((item, idx) => {
                                            const customTarget = parseFloat(targetUnitPrices[item.id] || '');
                                            const hasCustomTarget = !isNaN(customTarget) && customTarget > 0;
                                            const effectiveUnit = hasCustomTarget ? customTarget : item.price;
                                            const itemBaseline = item.price * item.quantity;
                                            const itemTargetTotal = effectiveUnit * item.quantity;
                                            const itemSavings = Math.max(0, itemBaseline - itemTargetTotal);
                                            const itemDiscountPercent = itemBaseline > 0 ? (((itemBaseline - itemTargetTotal) / itemBaseline) * 100).toFixed(0) : '0';
                                            const itemSku = (item as any).sku || item.id.slice(0, 8).toUpperCase();

                                            return (
                                                <tr key={idx} className="hover:bg-gray-50/40 transition-colors">
                                                    {/* Product */}
                                                    <td className="py-4 px-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-12 h-12 bg-gray-50 rounded p-1 border border-gray-100 flex items-center justify-center shrink-0">
                                                                <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-800 text-xs md:text-sm line-clamp-1">
                                                                    {item.name}
                                                                </p>
                                                                <span className="text-[10px] text-gray-500 font-mono">
                                                                    SKU: {itemSku}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Quantity */}
                                                    <td className="py-4 px-3 text-center">
                                                        <span className="font-semibold text-gray-800 text-xs bg-gray-50 border border-gray-200 px-2.5 py-1 rounded">
                                                            {item.quantity} units
                                                        </span>
                                                    </td>

                                                    {/* Catalog Price */}
                                                    <td className="py-4 px-3 text-right">
                                                        <div className="font-medium text-gray-800 text-xs">
                                                            {formatPrice(item.price * item.quantity)}
                                                        </div>
                                                        <div className="text-[10px] text-gray-400">
                                                            {formatPrice(item.price)}/ea
                                                        </div>
                                                    </td>

                                                    {/* Target Unit Price Input (Wider & Cleaner) */}
                                                    <td className="py-4 px-3 text-center">
                                                        <div className="inline-flex items-center gap-1.5 border border-gray-300 rounded px-2.5 py-1.5 bg-white focus-within:border-gray-500 w-28 md:w-32 justify-between">
                                                            <input 
                                                                type="number"
                                                                step="any"
                                                                min="0.01"
                                                                placeholder={item.price.toFixed(2)}
                                                                value={targetUnitPrices[item.id] || ''}
                                                                onChange={e => handleTargetPriceChange(item.id, e.target.value)}
                                                                className="w-full text-xs md:text-sm font-semibold text-right focus:outline-none"
                                                            />
                                                            <span className="text-[10px] text-gray-500 font-medium shrink-0">{currency}</span>
                                                        </div>
                                                    </td>

                                                    {/* Proposed Target Line Total */}
                                                    <td className="py-4 px-1 text-right">
                                                        <div className={`font-semibold text-xs md:text-sm ${hasCustomTarget ? 'text-emerald-700' : 'text-gray-900'}`}>
                                                            {formatPrice(itemTargetTotal)}
                                                        </div>
                                                        {hasCustomTarget && itemSavings > 0 ? (
                                                            <span className="text-[10px] text-emerald-600 font-semibold">
                                                                -{itemDiscountPercent}% ({formatPrice(itemSavings)})
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-400">Standard</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Negotiation Pricing Summary (Right-Sided) */}
                            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col items-end">
                                <div className="w-full max-w-sm text-right space-y-2">
                                    <h3 className="text-[15px] md:text-[16px] font-semibold text-gray-900 mb-1">
                                        {isArabic ? 'ملخص تسعير المفاوضة' : 'Negotiation Pricing Summary'}
                                    </h3>
                                    <p className="text-[11px] text-gray-500 mb-3">
                                        {isArabic 
                                            ? 'الأسعار المقترحة خاضعة لمراجعة واعتماد إدارة المبيعات.'
                                            : 'Proposed target rates will be reviewed and approved by the commercial sales division.'}
                                    </p>

                                    <div className="flex justify-between items-center text-xs md:text-sm text-gray-600">
                                        <span>{isArabic ? 'إجمالي الكتالوج القياسي:' : 'Catalog Standard Total:'}</span>
                                        <span className="font-semibold text-gray-800">{formatPrice(estimatedSubtotal)}</span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center text-gray-900 font-semibold pt-1 border-t border-gray-100">
                                        <span>{isArabic ? 'إجمالي السعر المستهدف المطلوب:' : 'Your Proposed Target Subtotal:'}</span>
                                        <span className="text-sm md:text-base font-bold text-gray-900">{formatPrice(buyerTargetSubtotal)}</span>
                                    </div>

                                    {buyerTargetSubtotal < estimatedSubtotal && (
                                        <div className="flex justify-between items-center text-emerald-700 font-semibold text-xs">
                                            <span>{isArabic ? 'الخصم المستهدف المطلوب:' : 'Proposed Target Savings:'}</span>
                                            <span>-{formatPrice(overallSavingsTarget)} (-{savingsPercent}%)</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ========================================================= */}
                        {/* SECTION 2: COMPANY & LOGISTICS (SIDE BY SIDE) */}
                        {/* ========================================================= */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-8 border-b border-gray-200">
                            
                            {/* Card A: Company & Procurement Representative */}
                            <div>
                                <h3 className="text-[16px] md:text-[17px] font-semibold text-gray-900 mb-4">
                                    {isArabic ? 'بيانات المنشأة والمسؤول' : 'Company & Procurement Representative'}
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                                            Company / Organization Name *
                                        </label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={companyName}
                                            onChange={e => setCompanyName(e.target.value)}
                                            placeholder="e.g. Al Mansoor Hospitality & Catering LLC"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:bg-white focus:border-gray-400 focus:outline-none transition-colors"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                                            VAT / Tax ID / CR Number
                                        </label>
                                        <input 
                                            type="text" 
                                            value={taxNumber}
                                            onChange={e => setTaxNumber(e.target.value)}
                                            placeholder="e.g. 300123456700003"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-mono focus:bg-white focus:border-gray-400 focus:outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                                            Contact Person *
                                        </label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={contactName}
                                            onChange={e => setContactName(e.target.value)}
                                            placeholder="e.g. Snehasis Shit"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:bg-white focus:border-gray-400 focus:outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                                            Business Email *
                                        </label>
                                        <input 
                                            type="email" 
                                            required 
                                            value={contactEmail}
                                            onChange={e => setContactEmail(e.target.value)}
                                            placeholder="procurement@company.com"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:bg-white focus:border-gray-400 focus:outline-none transition-colors"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                                            Phone / Mobile *
                                        </label>
                                        <input 
                                            type="tel" 
                                            required 
                                            value={contactPhone}
                                            onChange={e => setContactPhone(e.target.value)}
                                            placeholder="+971 50 123 4567"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:bg-white focus:border-gray-400 focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Card B: Logistics & Contract Budget */}
                            <div>
                                <h3 className="text-[16px] md:text-[17px] font-semibold text-gray-900 mb-4">
                                    {isArabic ? 'اللوجستيات وميزانية العقد' : 'Logistics & Contract Budget'}
                                </h3>

                                <div className="space-y-4 text-xs">
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                                            Delivery Destination / Site
                                        </label>
                                        <input 
                                            type="text" 
                                            value={deliverySite}
                                            onChange={e => setDeliverySite(e.target.value)}
                                            placeholder="e.g. Riyadh Central Kitchen, Warehouse 12"
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:bg-white focus:border-gray-400 focus:outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                                            Required Delivery Schedule
                                        </label>
                                        <select 
                                            value={expectedTimeline}
                                            onChange={e => setExpectedTimeline(e.target.value)}
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:bg-white focus:border-gray-400 focus:outline-none transition-colors"
                                        >
                                            <option value="Urgent (1-2 business days)">Urgent (1–2 business days)</option>
                                            <option value="Standard (3-5 business days)">Standard (3–5 business days)</option>
                                            <option value="Next Week Delivery">Next Week Delivery</option>
                                            <option value="Monthly Scheduled Shipments">Monthly Scheduled Shipments</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                                            Target Overall Contract Budget (Optional)
                                        </label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                step="any"
                                                value={targetOverallBudget}
                                                onChange={e => setTargetOverallBudget(e.target.value)}
                                                placeholder="e.g. 5000"
                                                className="w-full pl-3.5 pr-14 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-semibold focus:bg-white focus:border-gray-400 focus:outline-none transition-colors"
                                            />
                                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                                                {currency}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                                            Project Notes / Target Pricing Requirements
                                        </label>
                                        <textarea 
                                            rows={3}
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder={isArabic ? 'أدخل أي متطلبات خاصة بالشهادات الصحية، مواعيد الاستلام، أو شروط التوريد...' : 'Provide any packaging specifications, target budget, or contract terms...'}
                                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-xs focus:bg-white focus:border-gray-400 focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ========================================================= */}
                        {/* SECTION 3: SUBMIT ACTION BUTTON (RIGHT-ALIGNED) */}
                        {/* ========================================================= */}
                        <div className="pt-2 flex justify-end">
                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-[#1a2b25] text-white py-3.5 px-8 rounded-xl font-semibold text-xs uppercase tracking-wider hover:bg-[#22322a] transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin text-[#fbdc3c]" />
                                        <span>{isArabic ? 'جاري إرسال الطلب...' : 'Submitting...'}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>{isArabic ? 'إرسال طلب عرض السعر' : 'Submit Quotation Request'}</span>
                                        <ArrowUpRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>

                    </form>
                )}

            </div>

            {/* Bottom Brand CTA */}
            <div className="mt-8">
                <ConnectCTA />
            </div>

        </div>
    );
}
