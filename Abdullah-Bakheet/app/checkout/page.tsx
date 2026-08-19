"use client";

import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import { placeOrderApi, fetchProducts } from '@/lib/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRightIcon, CheckIcon, CreditCardIcon, XIcon } from 'lucide-animated';
import { Banknote, ShieldCheck, Smartphone, Sparkles, Loader2 } from 'lucide-react';

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
        currency,
        shippingCost,
        shippingFormatted,
        selectedShippingMethod,
        selectedShippingMethodId,
        setSelectedShippingMethodId,
        shippingMethods,
        isCorporateUser,
    } = useShop();
    const router = useRouter();

    const [firstName, setFirstName] = useState(user?.firstName || 'Abdullah');
    const [lastName, setLastName] = useState(user?.lastName || 'Bakheet');
    const [email, setEmail] = useState(user?.email || 'demo@dubai-ecom.com');
    const [phone, setPhone] = useState(user?.phone || '+971 50 123 4567');
    const [street, setStreet] = useState('Sheikh Zayed Road, Tower 4');
    const [pinCode, setPinCode] = useState('00000');
    const [city, setCity] = useState('Dubai');
    const [country, setCountry] = useState('UAE');

    // Payment Form state
    const [paymentMethod, setPaymentMethod] = useState<'credit' | 'applepay' | 'cod' | 'credit_terms' | 'purchase_order'>(
        isCorporateUser ? 'credit_terms' : 'credit'
    );
    const [poReference, setPoReference] = useState('');
    const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
    const [cardHolder, setCardHolder] = useState('Abdullah Bakheet');
    const [expiry, setExpiry] = useState('12/28');
    const [cvv, setCvv] = useState('123');

    // Fake Gateway Processing state
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [paymentStepText, setPaymentStepText] = useState('Initializing DubaiPay Gateway...');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [placedOrder, setPlacedOrder] = useState<any | null>(null);
    const [isOrderComplete, setIsOrderComplete] = useState(false);

    const subtotalConverted = getConvertedPrice(cartTotal);
    const totalConverted = subtotalConverted + (cart.length > 0 ? shippingCost : 0);
    const currSymbol = currency === 'SAR' ? 'ر.س' : (currency === 'USD' ? '$' : (currency === 'EUR' ? '€' : (currency === 'INR' ? '₹' : 'AED')));
    const totalFormatted = `${currSymbol} ${totalConverted.toFixed(2)}`;

    const handleFillDemoCard = () => {
        setCardNumber('4242 4242 4242 4242');
        setCardHolder('Abdullah Bakheet Demo');
        setExpiry('12/28');
        setCvv('123');
    };

    const handleCheckout = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage(null);
        setIsProcessingPayment(true);

        const countryCode = country === 'Saudi Arabia' ? 'SA' : (country === 'UAE' ? 'AE' : 'IN');

        // Fake Payment Gateway Simulation
        try {
            setPaymentStepText('Connecting to DubaiPay Secure Gateway...');
            await new Promise(r => setTimeout(r, 600));

            if (paymentMethod === 'credit_terms') {
                setPaymentStepText(`Authorizing Corporate Net 30 Credit (${formatPrice(user?.availableCredit || 0)} available)...`);
                await new Promise(r => setTimeout(r, 600));
            } else if (paymentMethod === 'purchase_order') {
                setPaymentStepText(`Validating Purchase Order Invoice (${poReference || 'PO-DIRECT'})...`);
                await new Promise(r => setTimeout(r, 600));
            } else if (paymentMethod === 'credit') {
                setPaymentStepText(`Verifying Demo Card (${cardNumber.slice(-4) || '4242'})...`);
                await new Promise(r => setTimeout(r, 600));
            } else if (paymentMethod === 'applepay') {
                setPaymentStepText('Authorizing 1-Tap Apple Pay Demo...');
                await new Promise(r => setTimeout(r, 600));
            } else {
                setPaymentStepText('Securing Cash on Delivery Order...');
                await new Promise(r => setTimeout(r, 600));
            }

            setPaymentStepText('Authorizing payment & creating order in backend-v2...');

            // Resolve fresh live DB product IDs and include item details so unitPrice and image are never lost
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

            const resolvedPaymentType = paymentMethod === 'credit_terms' 
                ? 'CREDIT_TERMS' 
                : (paymentMethod === 'purchase_order' ? 'PURCHASE_ORDER' : paymentMethod.toUpperCase());

            const orderPayload: any = {
                currency: (currency || 'AED').toUpperCase(),
                shippingMethodId: selectedShippingMethodId || 'standard',
                shippingCost: shippingCost,
                shippingAddressSnapshot: {
                    fullName: `${firstName} ${lastName}`.trim() || 'Customer',
                    line1: street || 'Street address',
                    city: city || 'Dubai',
                    state: city || 'Dubai',
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
                    ? `Billed to Corporate Net 30 Credit Line (${user?.companyName || 'Corporate Client'})`
                    : (paymentMethod === 'purchase_order' ? `Purchase Order Invoice: ${poReference || 'PO-DEFAULT'}` : `Fake Payment Provider Demo Gateway - Method: ${paymentMethod.toUpperCase()}`),
                items: validItems,
            };

            const result = await placeOrderApi(orderPayload, guestSessionId, accessToken || undefined);
            
            setPaymentStepText('Payment Approved! Finalizing receipt...');
            await new Promise(r => setTimeout(r, 400));

            setPlacedOrder(result?.order || result);
            clearCart();
            setIsOrderComplete(true);
        } catch (err: any) {
            console.error('Order placement error:', err);
            setErrorMessage(err.message || 'Failed to place order. Please try again.');
        } finally {
            setIsProcessingPayment(false);
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

    if (cart.length === 0 && !isOrderComplete) {
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

    return (
        <div className="w-full bg-[#f8f9fa] min-h-screen text-black pb-24 font-sans">
            
            {/* Header Section */}
            <div className="pt-20 pb-12 flex justify-center items-center px-4">
                <h1 className="font-heading text-4xl md:text-6xl lg:text-8xl uppercase text-[#1a2b25] tracking-wider flex flex-wrap justify-center items-center gap-3 md:gap-4 text-center">
                    FINAL <span className="bg-[#fbdc3c] px-4 pt-2 pb-1 text-[#1a2b25]">CHECKOUT</span>
                </h1>
            </div>

            {/* Main Checkout Area */}
            <div className="max-w-[1200px] mx-auto px-4">
                

                <form onSubmit={handleCheckout} className="flex flex-col lg:flex-row gap-10">
                    
                    {/* Left Column - Forms */}
                    <div className="flex-1 space-y-12">
                        
                        {/* SHIPPING INFORMATION */}
                        <section>
                            <div className="bg-[#fbdc3c] py-3 px-6 mb-8 inline-block">
                                <h2 className="font-heading text-3xl md:text-5xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                                    SHIPPING INFORMATION
                                </h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">First Name</label>
                                    <input required type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="First name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Last Name</label>
                                    <input required type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Last name" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Email</label>
                                    <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="abc@gmail.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Phone</label>
                                    <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="+971 50 123 4567" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Street</label>
                                    <input required type="text" value={street} onChange={(e) => setStreet(e.target.value)} className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Sheikh Zayed Road" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Pin Code</label>
                                    <input required type="text" value={pinCode} onChange={(e) => setPinCode(e.target.value)} className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="00000" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">City</label>
                                    <input required type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Dubai" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Country</label>
                                    <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm appearance-none">
                                        <option>UAE</option>
                                        <option>Saudi Arabia</option>
                                        <option>India</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* CHECKOUT INFORMATION (Fake Payment Provider Demo) */}
                        <section>
                            <div className="bg-[#fbdc3c] py-3 px-6 mb-4 inline-block">
                                <h2 className="font-heading text-3xl md:text-5xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                                    PAYMENT PROVIDER
                                </h2>
                            </div>

                            <p className="text-xs text-gray-500 mb-6 font-medium flex items-center gap-1.5">
                                <ShieldCheck size={14} className="text-emerald-600" />
                                Simulated payment gateway.
                            </p>

                            <div className="flex flex-wrap gap-3 mb-8">
                                {isCorporateUser && (
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMethod('credit_terms')}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                                            paymentMethod === 'credit_terms' 
                                                ? 'bg-emerald-800 text-white shadow-sm' 
                                                : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                                        }`}
                                    >
                                        🏢 Corporate Net 30 Credit
                                    </button>
                                )}

                                {isCorporateUser && (
                                    <button 
                                        type="button"
                                        onClick={() => setPaymentMethod('purchase_order')}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                                            paymentMethod === 'purchase_order' 
                                                ? 'bg-[#1a2b25] text-white shadow-sm' 
                                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                        }`}
                                    >
                                        📑 Purchase Order (PO)
                                    </button>
                                )}

                                <button 
                                    type="button"
                                    onClick={() => setPaymentMethod('credit')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                                        paymentMethod === 'credit' 
                                            ? 'bg-[#fbdc3c] text-black shadow-sm' 
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <CreditCardIcon size={16} /> DubaiPay Gateway
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => setPaymentMethod('applepay')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                                        paymentMethod === 'applepay' 
                                            ? 'bg-[#fbdc3c] text-black shadow-sm' 
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <Smartphone size={16} /> Apple Pay 1-Tap
                                </button>

                                <button 
                                    type="button"
                                    onClick={() => setPaymentMethod('cod')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-colors cursor-pointer ${
                                        paymentMethod === 'cod' 
                                            ? 'bg-[#fbdc3c] text-black shadow-sm' 
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <Banknote size={16} /> Cash on Delivery
                                </button>
                            </div>

                            {/* Corporate Net 30 Credit Panel */}
                            {paymentMethod === 'credit_terms' && (
                                <div className="space-y-4 bg-emerald-50/80 p-6 rounded-xl border border-emerald-200 shadow-xs text-xs text-emerald-950">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-base font-bold text-emerald-950">🏢 Net 30 Corporate Credit Line</h3>
                                        <span className="bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded text-[11px]">AUTHORIZED</span>
                                    </div>
                                    <p className="text-emerald-800 leading-relaxed">
                                        This order will be automatically authorized against your corporate credit line with Net 30 settlement terms. An official commercial invoice will be generated upon fulfillment.
                                    </p>
                                    <div className="pt-3 border-t border-emerald-200/80 flex items-center justify-between font-bold text-emerald-900 text-sm">
                                        <span>Available Credit Balance:</span>
                                        <span>{formatPrice(user?.availableCredit || 0)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Purchase Order Panel */}
                            {paymentMethod === 'purchase_order' && (
                                <div className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-xs text-xs">
                                    <h3 className="text-base font-bold text-gray-900">📑 Purchase Order (PO) Reference</h3>
                                    <div>
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                                            Internal PO Reference Number *
                                        </label>
                                        <input 
                                            required
                                            type="text"
                                            value={poReference}
                                            onChange={e => setPoReference(e.target.value)}
                                            placeholder="e.g. PO-2026-ALM-4401"
                                            className="w-full bg-white border border-gray-300 rounded-md p-3 text-xs focus:outline-none focus:border-[#1a2b25]"
                                        />
                                    </div>
                                    <p className="text-gray-500 text-[11px]">
                                        Your purchasing department will receive the commercial invoice linked to this PO number.
                                    </p>
                                </div>
                            )}

                            {paymentMethod === 'credit' && (
                                <div className="space-y-6 bg-white p-6 rounded-xl border border-gray-100 shadow-xs">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-black">DubaiPay Demo Gateway</h3>
                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">SIMULATOR</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleFillDemoCard}
                                            className="text-xs text-amber-900 bg-amber-100 hover:bg-amber-200 font-bold px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors"
                                        >
                                             Fill Demo Card
                                        </button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                        <div className="space-y-2 col-span-1 md:col-span-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Card Number</label>
                                            <div className="relative">
                                                <input 
                                                    required 
                                                    type="text" 
                                                    value={cardNumber} 
                                                    onChange={(e) => setCardNumber(e.target.value)} 
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-md p-3 text-sm font-mono tracking-wider focus:outline-none focus:border-gray-400" 
                                                    placeholder="4242 4242 4242 4242" 
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                                    <CheckIcon size={16} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Card Holder</label>
                                            <input 
                                                required 
                                                type="text" 
                                                value={cardHolder} 
                                                onChange={(e) => setCardHolder(e.target.value)} 
                                                className="w-full bg-gray-50 border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400" 
                                                placeholder="Card Holder Name" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Expiry</label>
                                                <input 
                                                    required 
                                                    type="text" 
                                                    value={expiry} 
                                                    onChange={(e) => setExpiry(e.target.value)} 
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400" 
                                                    placeholder="12/28" 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">CVV</label>
                                                <input 
                                                    required 
                                                    type="text" 
                                                    value={cvv} 
                                                    onChange={(e) => setCvv(e.target.value)} 
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-md p-3 text-sm focus:outline-none focus:border-gray-400" 
                                                    placeholder="123" 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'applepay' && (
                                <div className="bg-black text-white p-6 rounded-xl text-center space-y-4">
                                    <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto">
                                        <Smartphone size={24} />
                                    </div>
                                    <h4 className="font-bold text-lg">Apple Pay Demo Authorization</h4>
                                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                                        1-Tap Instant Demo Authentication enabled. Click BUY NOW to simulate TouchID / FaceID payment authorization.
                                    </p>
                                </div>
                            )}

                            {paymentMethod === 'cod' && (
                                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-xl text-center space-y-2">
                                    <h4 className="font-bold text-base">Cash on Delivery</h4>
                                    <p className="text-xs text-amber-800">
                                        Pay via Cash, Card, or Business Check upon delivery at your warehouse or restaurant.
                                    </p>
                                </div>
                            )}

                        </section>
                    </div>

                    {/* Right Column - Order Summary */}
                    <div className="w-full lg:w-[400px] shrink-0">
                        <div className="bg-white p-6 md:p-8 rounded-md shadow-sm border border-gray-100 sticky top-8">
                            
                            <div className="bg-[#fbdc3c] py-3 px-5 mb-8 -mx-2">
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
                            </div>

                            <div className="border-t border-gray-100 pt-6 mb-8 flex justify-between items-end">
                                <span className="text-sm font-medium text-gray-600">Total</span>
                                <span className="text-2xl font-black text-black">{totalFormatted}</span>
                            </div>

                            <button 
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#1a2b25] text-white py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors group disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 size={16} className="animate-spin" /> PROCESSING...
                                    </span>
                                ) : (
                                    <>
                                        BUY NOW (DEMO GATEWAY)
                                        <ArrowUpRightIcon size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                                    </>
                                )}
                            </button>

                        </div>
                    </div>

                </form>
            </div>

            {/* Fake Payment Gateway Processing Overlay */}
            {isProcessingPayment && !isOrderComplete && (
                <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-gray-100">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 rounded-full border-4 border-amber-300 border-t-brand-dark animate-spin" />
                            <div className="absolute inset-0 flex items-center justify-center font-bold text-xs">
                                🔒
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">DubaiPay Gateway</h3>
                            <p className="text-xs text-gray-500 font-medium">{paymentStepText}</p>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-[#fbdc3c] h-full animate-pulse w-3/4 rounded-full" />
                        </div>
                    </div>
                </div>
            )}

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
                                Order Completed
                            </h2>
                            <p className="text-xs text-gray-500 mb-6 font-medium">
                                Demo Payment Provider Gateway transaction approved!
                            </p>

                            <div className="w-full border border-gray-100 bg-gray-50/50 rounded-lg p-5 mb-6 space-y-3.5 text-left">
                                <div className="flex justify-between items-start border-b border-gray-200/60 pb-3">
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                                        <div className="bg-[#fbdc3c] text-black text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                                            {placedOrder?.status || 'PAID (DEMO)'} <CheckIcon size={12} />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Order ID</p>
                                        <p className="text-[12px] font-bold text-gray-900 font-mono truncate max-w-[150px]">
                                            {placedOrder?.orderNumber || placedOrder?.id || 'ABLH-ORDER-OK'}
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
                                            const ordCurr = (placedOrder?.currency || currency || 'AED').toUpperCase();
                                            const sym = ordCurr === 'SAR' ? 'ر.س' : (ordCurr === 'USD' ? '$' : (ordCurr === 'EUR' ? '€' : (ordCurr === 'INR' ? '₹' : 'AED')));
                                            return `${sym} ${rawVal.toFixed(2)}`;
                                        })()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                                    <span>Payment Method</span>
                                    <span className="font-semibold text-black capitalize">{paymentMethod === 'credit' ? 'DubaiPay Demo Gateway' : paymentMethod}</span>
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
