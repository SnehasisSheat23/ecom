"use client";

import React, { useState, useEffect } from 'react';
import { useShop } from '@/context/ShopContext';
import { placeOrderApi, fetchProducts, verifyOrderPaymentApi } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRightIcon, CheckIcon, CreditCardIcon, XIcon } from 'lucide-animated';
import { Banknote, ShieldCheck, Smartphone, Building2, FileText, Landmark, Loader2, Clock } from 'lucide-react';

export default function CheckoutPage() {
    const {
        cart,
        cartTotal,
        formatPrice,
        getConvertedPrice,
        guestSessionId,
        accessToken,
        isAuthLoading,
        clearCart,
        user,
        language,
        currency,
        shippingCost,
        shippingFormatted,
        selectedShippingMethod,
        selectedShippingMethodId,
        isCorporateUser,
    } = useShop();
    const router = useRouter();

    // Customer & Shipping Form state (No hardcoded demo values)
    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [street, setStreet] = useState('');
    const [pinCode, setPinCode] = useState('');
    const [city, setCity] = useState('');
    const [country, setCountry] = useState('Saudi Arabia');

    // Payment Form state
    const [paymentMethod, setPaymentMethod] = useState<'nalpay' | 'cod' | 'bank_transfer' | 'credit_terms' | 'purchase_order'>('nalpay');
    const [poReference, setPoReference] = useState('');

    // Submission & state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [placedOrder, setPlacedOrder] = useState<any | null>(null);
    const [isOrderComplete, setIsOrderComplete] = useState(false);
    const [isAwaitingNalpayPayment, setIsAwaitingNalpayPayment] = useState(false);
    const [pendingPaymentUrl, setPendingPaymentUrl] = useState<string | null>(null);
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
    const [pendingOrderNumber, setPendingOrderNumber] = useState<string | null>(null);
    const [isCheckingPayment, setIsCheckingPayment] = useState(false);

    const subtotalConverted = getConvertedPrice(cartTotal);
    const vatRate = currency === 'SAR' ? 0.15 : (currency === 'AED' ? 0.05 : 0);
    const vatAmount = subtotalConverted * vatRate;
    const totalConverted = subtotalConverted + (cart.length > 0 ? shippingCost : 0) + vatAmount;
    const currSymbol = (currency === 'SAR' || !currency) ? (language.startsWith('Arabic') ? 'ر.س' : 'SAR') : (currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : (currency === 'INR' ? '₹' : (currency === 'AED' ? 'AED' : 'SAR'))));
    const totalFormatted = `${currSymbol} ${totalConverted.toFixed(2)}`;
    const vatFormatted = `${currSymbol} ${vatAmount.toFixed(2)}`;

    const [isPollingPaused, setIsPollingPaused] = useState(false);

    // Smart Adaptive Polling for NalPay Settlement
    useEffect(() => {
        if (!isAwaitingNalpayPayment || !pendingOrderId || isPollingPaused) return;

        let isMounted = true;
        let pollCount = 0;
        let timeoutId: NodeJS.Timeout;

        const checkSettlement = async () => {
            if (!isMounted) return;
            try {
                const res = await verifyOrderPaymentApi(pendingOrderId, accessToken || undefined);
                if (res?.paid && isMounted) {
                    clearCart();
                    setIsAwaitingNalpayPayment(false);
                    try {
                        localStorage.removeItem('last_nalpay_checkout');
                    } catch (e) {}
                    const targetId = res.order?.orderNumber || pendingOrderNumber || pendingOrderId;
                    router.push(`/orders/${targetId}`);
                    return;
                }
            } catch (err) {
                console.warn('Adaptive polling check error:', err);
            }

            pollCount += 1;

            // 10-minute timeout guard: stop after ~60 total checks
            if (pollCount > 65) {
                if (isMounted) setIsPollingPaused(true);
                return;
            }

            // Adaptive backoff: 4s for first min, 8s until 5 mins, 15s afterwards
            const nextDelay = pollCount < 15 ? 4000 : (pollCount < 40 ? 8000 : 15000);
            if (isMounted) {
                timeoutId = setTimeout(checkSettlement, nextDelay);
            }
        };

        // Initial delay before first check
        timeoutId = setTimeout(checkSettlement, 3500);

        // Immediate check whenever user switches back to this tab
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isMounted && !isPollingPaused) {
                checkSettlement();
            }
        };
        window.addEventListener('focus', handleVisibilityChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
            window.removeEventListener('focus', handleVisibilityChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [isAwaitingNalpayPayment, pendingOrderId, pendingOrderNumber, isPollingPaused, accessToken, clearCart, router]);

    const handleCheckStatusNow = async () => {
        if (!pendingOrderId) return;
        setIsCheckingPayment(true);
        try {
            const res = await verifyOrderPaymentApi(pendingOrderId, accessToken || undefined);
            if (res?.paid) {
                clearCart();
                setIsAwaitingNalpayPayment(false);
                try {
                    localStorage.removeItem('last_nalpay_checkout');
                } catch (e) {}
                const targetId = res.order?.orderNumber || pendingOrderNumber || pendingOrderId;
                router.push(`/orders/${targetId}`);
            } else {
                // If it was paused, resume polling
                setIsPollingPaused(false);
                alert(language.startsWith('Arabic')
                    ? 'لم يتم العثور على تأكيد دفع بعد من نال باي. يرجى إتمام السداد في نافذة الدفع.'
                    : 'Payment has not been settled on NalPay yet. Please complete the transaction in the NalPay window.');
            }
        } catch (err) {
            console.error('Manual check failed:', err);
        } finally {
            setIsCheckingPayment(false);
        }
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage(null);

        const countryCode = country === 'Saudi Arabia' ? 'SA' : (country === 'UAE' ? 'AE' : 'IN');

        try {
            // Resolve fresh live DB product IDs and include item details
            const freshProducts = await fetchProducts({ limit: 100, currency }).catch(() => []);
            const validItems = cart.map(i => {
                const matchedProduct = freshProducts.find(p =>
                    p.variantId === i.variantId ||
                    p.id === i.id ||
                    p.title.toLowerCase().trim() === i.name.toLowerCase().trim()
                );
                const resolvedVariantId = matchedProduct?.id || matchedProduct?.variantId || i.variantId || i.id;
                const itemPrice = Number(i.price || 0);
                return {
                    productId: resolvedVariantId,
                    quantity: i.quantity,
                    unitPrice: Number(itemPrice.toFixed(2)),
                    price: Number(itemPrice.toFixed(2)),
                    name: i.name,
                    image: i.image,
                };
            });

            let resolvedPaymentType = 'CARD';
            if (paymentMethod === 'nalpay') resolvedPaymentType = 'CARD';
            else if (paymentMethod === 'cod') resolvedPaymentType = 'COD';
            else if (paymentMethod === 'bank_transfer') resolvedPaymentType = 'BANK_TRANSFER';
            else if (paymentMethod === 'credit_terms') resolvedPaymentType = 'CREDIT_TERMS';
            else if (paymentMethod === 'purchase_order') resolvedPaymentType = 'PURCHASE_ORDER';

            const orderPayload: any = {
                currency: (currency || 'SAR').toUpperCase(),
                shippingMethodId: selectedShippingMethodId || 'standard',
                shippingCost: shippingCost,
                shippingAddressSnapshot: {
                    fullName: `${firstName} ${lastName}`.trim() || 'Customer',
                    line1: street || 'Address',
                    city: city || 'Riyadh',
                    state: city || 'Riyadh',
                    postalCode: pinCode || '00000',
                    country: countryCode,
                    phone: phone || null,
                },
                guestEmail: email || user?.email || undefined,
                customerId: user?.id || undefined,
                paymentMethod: resolvedPaymentType,
                paymentMethodType: resolvedPaymentType,
                poNumber: poReference || undefined,
                notes: paymentMethod === 'credit_terms' 
                    ? `Corporate Net 30 Credit Line (${user?.companyName || 'Corporate Client'})`
                    : (paymentMethod === 'purchase_order' 
                        ? `Purchase Order: ${poReference || 'N/A'}` 
                        : (paymentMethod === 'nalpay' ? 'Payment Gateway: NalPay' : `Payment: ${paymentMethod.toUpperCase()}`)),
                items: validItems,
            };

            const result = await placeOrderApi(orderPayload, guestSessionId, accessToken || undefined);
            
            let paymentUrl = result?.paymentUrl || result?.order?.paymentUrl || result?.paymentLink || result?.order?.paymentReceiptUrl || result?.order?.paymentLink;
            
            // Client fallback to ensure NalPay link is always generated and ready
            if (!paymentUrl && paymentMethod === 'nalpay') {
                try {
                    const nalpayKey = 'sk_test_lRKb9Q1jp6pjmxOHE5IFP5oPXd1YdE3r';
                    const nalpayAmountHalalas = Math.round(totalConverted * 100);
                    const orderId = result?.orderNumber || result?.order?.orderNumber || result?.id || result?.order?.id || 'ORD-NEW';
                    const nRes = await fetch('https://nalpay.io/v1/payment_links', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${nalpayKey}`,
                            'Content-Type': 'application/json',
                            'Idempotency-Key': typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random()}`,
                        },
                        body: JSON.stringify({
                            amount: nalpayAmountHalalas,
                            currency: (currency || 'SAR').toUpperCase(),
                            description: `Order #${orderId}`,
                            metadata: { orderNumber: orderId },
                        }),
                    });
                    if (nRes.ok) {
                        const nData = await nRes.json();
                        paymentUrl = nData.url;
                    }
                } catch (e) {
                    console.error('NalPay fallback generation:', e);
                }
            }

            const orderData = result?.order || result;
            const orderIdVal = orderData?.id || result?.id || '';
            const orderNumberVal = orderData?.orderNumber || result?.orderNumber || orderIdVal || 'ORD-NEW';

            if (paymentUrl && paymentMethod === 'nalpay') {
                setPlacedOrder(orderData);
                setPendingPaymentUrl(paymentUrl);
                setPendingOrderId(orderIdVal);
                setPendingOrderNumber(orderNumberVal);
                setIsAwaitingNalpayPayment(true);

                try {
                    localStorage.setItem('last_nalpay_checkout', JSON.stringify({
                        orderId: orderIdVal,
                        orderNumber: orderNumberVal,
                        paymentUrl,
                        totalFormatted,
                        createdAt: new Date().toISOString(),
                    }));
                } catch (storageErr) {
                    console.warn('Storage save failed:', storageErr);
                }

                // Open NalPay in a dedicated, secure payment tab
                window.open(paymentUrl, '_blank', 'noopener,noreferrer');
                return;
            }

            clearCart();
            setPlacedOrder(result?.order || result);
            setIsOrderComplete(true);
        } catch (err: any) {
            console.error('Order placement error:', err);
            setErrorMessage(err.message || 'Failed to place order. Please check details and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    React.useEffect(() => {
        if (user) {
            if (user.firstName) setFirstName(user.firstName);
            if (user.lastName) setLastName(user.lastName);
            if (user.email) setEmail(user.email);
            if (user.phone) setPhone(user.phone);
        }
    }, [user]);

    React.useEffect(() => {
        if (!isAuthLoading && !accessToken && !isOrderComplete) {
            router.replace('/login?redirect=/checkout');
        }
    }, [isAuthLoading, accessToken, isOrderComplete, router]);

    if ((isAuthLoading || !accessToken) && !isOrderComplete) {
        return (
            <div className="w-full bg-brand-gray min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1a2b25]"></div>
            </div>
        );
    }

    if (cart.length === 0 && !isOrderComplete && !isAwaitingNalpayPayment) {
        return (
            <div className="min-h-screen bg-[#fcfcfc] flex flex-col items-center justify-center p-4">
                <h1 className="text-3xl font-bold mb-4">Your Cart is Empty</h1>
                <p className="text-gray-500 mb-8">Please add items to your cart before checking out.</p>
                <Link href="/products" className="bg-[#1a2b25] text-white px-8 py-3 rounded-full font-bold">
                    Return to Shop
                </Link>
            </div>
        );
    }

    // Really simple, clean full-page awaiting payment state matching the website design
    if (isAwaitingNalpayPayment) {
        return (
            <div className="w-full bg-[#f8f9fa] min-h-screen text-black font-sans pb-24">
                {/* Header Section */}
                <div className="pt-20 pb-8 flex justify-center items-center px-4">
                    <h1 className="font-heading text-3xl md:text-5xl uppercase text-[#1a2b25] tracking-wider text-center">
                        PAYMENT IN PROGRESS
                    </h1>
                </div>

                <div className="max-w-md mx-auto px-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-6 shadow-xs">
                        
                        <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-200 text-[#1a2b25] flex items-center justify-center mx-auto">
                            <CreditCardIcon size={24} />
                        </div>

                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                Order #{pendingOrderNumber}
                            </p>
                            <h2 className="text-2xl font-bold text-[#1a2b25] mt-1">
                                Complete Payment on NalPay
                            </h2>
                            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                                A secure payment window has been opened for <span className="font-bold text-gray-900">{totalFormatted}</span>.
                                <br />
                                Once you complete payment, this page will automatically confirm your order.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center justify-between text-left">
                            <div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Reference</p>
                                <p className="text-xs font-mono font-bold text-gray-900">{pendingOrderNumber}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Amount to Pay</p>
                                <p className="text-base font-black text-[#1a2b25]">{totalFormatted}</p>
                                <p className="text-[10px] text-gray-500 font-medium">Includes 15% VAT & Delivery</p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            {pendingPaymentUrl && (
                                <a
                                    href={pendingPaymentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full bg-[#1a2b25] hover:bg-black text-white py-3.5 rounded-lg font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-colors cursor-pointer"
                                >
                                    <span>Open Payment Window</span>
                                    <ArrowUpRightIcon size={14} />
                                </a>
                            )}

                            <button
                                onClick={handleCheckStatusNow}
                                disabled={isCheckingPayment}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                            >
                                {isCheckingPayment ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin text-gray-600" />
                                        <span>Checking Status...</span>
                                    </>
                                ) : (
                                    <span>I Have Completed Payment</span>
                                )}
                            </button>

                            <button
                                onClick={() => setIsAwaitingNalpayPayment(false)}
                                className="text-xs text-gray-400 hover:text-black transition-colors pt-2 block mx-auto underline cursor-pointer"
                            >
                                Return to Checkout Form
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full bg-[#f8f9fa] min-h-screen text-black pb-24 font-sans">
            
            {/* Header Section */}
            <div className="pt-20 pb-12 flex justify-center items-center px-4">
                <h1 className="font-heading text-4xl md:text-6xl lg:text-8xl uppercase text-[#1a2b25] tracking-wider flex flex-wrap justify-center items-center gap-3 md:gap-4 text-center">
                    FINAL <span className="px-4 pt-2 pb-1 text-[#1a2b25]">CHECKOUT</span>
                </h1>
            </div>

            {/* Main Checkout Area */}
            <div className="max-w-[1200px] mx-auto px-4">
                
                {errorMessage && (
                    <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
                        <span>{errorMessage}</span>
                        <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                    </div>
                )}

                <form onSubmit={handleCheckout} className="flex flex-col lg:flex-row gap-10">
                    
                    {/* Left Column - Forms */}
                    <div className="flex-1 space-y-12">
                        
                        {/* SHIPPING INFORMATION */}
                        <section>
                            <div className="py-3 px-6 mb-8 inline-block">
                                <h2 className="font-heading text-3xl md:text-5xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                                    SHIPPING INFORMATION
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">First Name *</label>
                                    <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 shadow-xs" placeholder="First name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Last Name *</label>
                                    <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 shadow-xs" placeholder="Last name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Email Address *</label>
                                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 shadow-xs" placeholder="name@example.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Phone Number *</label>
                                    <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 shadow-xs" placeholder="+966 50 000 0000" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Street Address *</label>
                                    <input required type="text" value={street} onChange={(e) => setStreet(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 shadow-xs" placeholder="Street name, Building No., District" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Postal / Zip Code</label>
                                    <input type="text" value={pinCode} onChange={(e) => setPinCode(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 shadow-xs" placeholder="e.g. 12211" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">City *</label>
                                    <input required type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 shadow-xs" placeholder="City name" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">Country *</label>
                                    <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-white border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400 shadow-xs">
                                        <option>Saudi Arabia</option>
                                        <option>UAE</option>
                                        <option>India</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* PAYMENT METHOD */}
                        <section>
                            <div className="py-3 px-6 mb-4 inline-block">
                                <h2 className="font-heading text-3xl md:text-5xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                                    PAYMENT METHOD
                                </h2>
                            </div>

                            <div className="flex flex-wrap gap-3 mb-6">
                                <div className="flex items-center gap-2 px-6 py-3.5 rounded-full font-black text-xs md:text-sm bg-[#fbdc3c] text-black shadow-xs">
                                    <CreditCardIcon size={16} /> NalPay (Mada / Cards / Apple Pay)
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="w-full lg:w-[400px] shrink-0">
                        <div className="bg-white p-6 md:p-8 rounded-md shadow-sm border border-gray-100 sticky top-8">
                            
                            <div className="py-3 px-5 mb-8 -mx-2">
                                <h3 className="font-heading text-2xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-1">
                                    YOUR ORDERS
                                </h3>
                            </div>

                            <div className="space-y-6 mb-8 max-h-60 overflow-y-auto pr-1">
                                {cart.map((item, index) => (
                                    <div key={item.itemId || `${item.id}-${item.variantId || ''}-${index}`} className="flex gap-4 border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                                        <div className="w-16 h-16 bg-white border border-gray-200 rounded-sm p-1 shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="text-[12px] font-bold uppercase text-black leading-snug">{item.name}</h4>
                                                <span className="text-[13px] font-semibold shrink-0">{formatPrice(item.price * item.quantity)}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-[11px] font-semibold text-gray-500 border border-gray-200 rounded px-2 py-0.5">
                                                    Qty: {item.quantity}
                                                </span>
                                                {item.moq && item.moq > 1 && (
                                                    <span className="text-[10px] text-amber-700 font-bold">
                                                        MOQ: {item.moq}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 border-t border-gray-100 pt-6 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 font-medium">Sub-Total</span>
                                    <span className="font-semibold text-black">{formatPrice(cartTotal)}</span>
                                </div>
                                <div className="flex justify-between items-start text-sm">
                                    <div>
                                        <span className="text-gray-600 font-medium block">Shipping Fee</span>
                                        <span className="text-[11px] text-gray-400 font-medium">
                                            {selectedShippingMethod?.name || 'Standard Regional Delivery'}
                                        </span>
                                    </div>
                                    <span className="font-semibold text-black">{shippingFormatted}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 font-medium">VAT (15%)</span>
                                    <span className="font-semibold text-black">{vatFormatted}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6 mb-8 flex justify-between items-end">
                                <span className="text-sm font-medium text-gray-600">Total</span>
                                <span className="text-2xl font-black text-black">{totalFormatted}</span>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#1a2b25] text-white py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors group disabled:opacity-50 cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" /> PLACING ORDER...
                                    </span>
                                ) : (
                                    <>
                                        PLACE ORDER
                                        <ArrowUpRightIcon size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                                    </>
                                )}
                            </button>

                        </div>
                    </div>

                </form>
            </div>



            {/* Order Complete Success Receipt Overlay */}
            {isOrderComplete && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 relative animate-in zoom-in-95 duration-300">
                        
                        <button 
                            onClick={() => {
                                setIsOrderComplete(false);
                                router.push('/');
                            }}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black text-white rounded-full hover:bg-gray-800 transition-colors"
                        >
                            <XIcon size={16} />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-[#fbdc3c] rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <CheckIcon size={32} className="text-black" />
                            </div>
                            
                            <h2 className="font-heading text-4xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none mb-2 pt-2">
                                Order Placed Successfully
                            </h2>
                            <p className="text-xs text-gray-500 mb-6 font-medium">
                                Your order has been recorded and is now being processed.
                            </p>

                            <div className="w-full border border-gray-100 bg-gray-50/50 rounded-lg p-5 mb-6 space-y-3.5 text-left">
                                <div className="flex justify-between items-start border-b border-gray-200/60 pb-3">
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                                        <div className="bg-emerald-100 text-emerald-900 text-[11px] font-bold px-2.5 py-0.5 rounded flex items-center gap-1 w-fit uppercase">
                                            {placedOrder?.status || 'CONFIRMED'} <CheckIcon size={12} />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Order ID</p>
                                        <p className="text-[12px] font-bold text-gray-900 font-mono truncate max-w-[150px]">
                                            {placedOrder?.orderNumber || placedOrder?.id || 'ORD-PLACED'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                                    <span>Date</span>
                                    <span className="font-semibold text-black">{new Date().toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                                    <span>Total Amount</span>
                                    <span className="font-bold text-black">
                                        {(() => {
                                            const rawVal = parseFloat(String(placedOrder?.totalAmount || placedOrder?.total || totalConverted));
                                            const ordCurr = (placedOrder?.currency || currency || 'SAR').toUpperCase();
                                            const sym = ordCurr === 'SAR' ? 'ر.س' : (ordCurr === 'USD' ? '$' : (ordCurr === 'EUR' ? '€' : (ordCurr === 'INR' ? '₹' : (ordCurr === 'AED' ? 'AED' : 'SAR'))));
                                            return `${sym} ${rawVal.toFixed(2)}`;
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                                    <span>Payment Method</span>
                                    <span className="font-semibold text-black capitalize">
                                        {paymentMethod === 'nalpay' 
                                            ? 'NalPay Gateway' 
                                            : (paymentMethod === 'bank_transfer' ? 'Bank Transfer' : paymentMethod)}
                                    </span>
                                </div>
                            </div>

                            <div className="w-full flex gap-3">
                                <button 
                                    onClick={() => router.push('/')}
                                    className="flex-1 bg-white text-black border border-gray-200 py-3.5 rounded-md font-bold text-[12px] uppercase tracking-wide flex justify-center items-center gap-2 hover:border-black transition-colors"
                                >
                                    BACK HOME
                                    <ArrowUpRightIcon size={14} className="text-gray-400" />
                                </button>
                                <button 
                                    onClick={() => router.push('/products')}
                                    className="flex-1 bg-[#1a2b25] text-white py-3.5 rounded-md font-bold text-[12px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors"
                                >
                                    SHOP MORE
                                    <ArrowUpRightIcon size={14} className="text-gray-400" />
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

