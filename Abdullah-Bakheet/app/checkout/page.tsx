"use client";

import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpRightIcon, CheckIcon, CreditCardIcon,  XIcon } from 'lucide-animated';
import { Banknote } from 'lucide-react';

export default function CheckoutPage() {
    const { cart, cartTotal, currency } = useShop();
    const router = useRouter();
    const [paymentMethod, setPaymentMethod] = useState<'credit' | 'cod'>('credit');
    const [isOrderComplete, setIsOrderComplete] = useState(false);

    const shippingFee = 200;
    const subTotal = cartTotal;
    const total = subTotal + (cart.length > 0 ? shippingFee : 0);

    const handleCheckout = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, process payment here
        setIsOrderComplete(true);
    };

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
        <div className="w-full bg-brand-gray min-h-screen font-sans py-12 relative">
            <div className="max-w-[1200px] mx-auto px-4 md:px-8">
                
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
                                    <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="abc" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Last Name</label>
                                    <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Joe" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Email</label>
                                    <input required type="email" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="abc@gmail.com" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Phone</label>
                                    <input required type="tel" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="+91 6345427444" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Street</label>
                                    <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Phase 7 road" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Pin Code</label>
                                    <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="242424" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">City</label>
                                    <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Chandigarh" />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Country</label>
                                    <select className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm appearance-none">
                                        <option>India</option>
                                        <option>Saudi Arabia</option>
                                        <option>UAE</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* CHECKOUT INFORMATION (Payment) */}
                        <section>
                            <div className="bg-[#fbdc3c] py-3 px-6 mb-8 inline-block">
                                <h2 className="font-heading text-3xl md:text-5xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                                    CHECKOUT INFORMATION
                                </h2>
                            </div>

                            <div className="flex gap-4 mb-8">
                                <button 
                                    type="button"
                                    onClick={() => setPaymentMethod('credit')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-colors ${
                                        paymentMethod === 'credit' 
                                            ? 'bg-[#fbdc3c] text-black shadow-sm' 
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <CreditCardIcon size={16} /> Credit card
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPaymentMethod('cod')}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-colors ${
                                        paymentMethod === 'cod' 
                                            ? 'bg-[#fbdc3c] text-black shadow-sm' 
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    <Banknote size={16} /> Cash on delivery
                                </button>
                            </div>

                            {paymentMethod === 'credit' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center gap-4 mb-6">
                                        <h3 className="text-xl font-bold text-black">Credit Card</h3>
                                        <div className="flex gap-2">
                                            {/* Mocking Mastercard/Visa icons */}
                                            <div className="w-8 h-5 bg-gradient-to-r from-red-500 to-yellow-500 rounded-sm"></div>
                                            <div className="w-8 h-5 bg-blue-600 text-[8px] text-white font-bold flex items-center justify-center rounded-sm italic">VISA</div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Card Number</label>
                                            <div className="relative">
                                                <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm pr-10" placeholder="1944 2811 5422 9076" />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                                    <CheckIcon size={16} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Card Holder</label>
                                            <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Sohom Das" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Expiry Date</label>
                                            <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="15/32" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">CVV</label>
                                            <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="1974" />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <div className="w-5 h-5 rounded bg-[#fbdc3c] flex items-center justify-center cursor-pointer">
                                            <CheckIcon size={12} className="text-black" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Save this Credit card</span>
                                    </div>
                                </div>
                            )}

                            {paymentMethod === 'cod' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="bg-[#fbdc3c] py-2 px-4 mb-4 inline-block mt-4">
                                        <h3 className="font-heading text-2xl md:text-3xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-1">
                                            BILLINGS
                                        </h3>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">First Name</label>
                                            <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="abc" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Last Name</label>
                                            <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Joe" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Email</label>
                                            <input required type="email" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="abc@gmail.com" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Phone</label>
                                            <input required type="tel" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="+91 6345427444" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Street</label>
                                            <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Phase 7 road" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Pin Code</label>
                                            <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="242424" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">City</label>
                                            <input required type="text" className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm" placeholder="Chandigarh" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wide">Country</label>
                                            <select className="w-full bg-white border border-gray-100 rounded-md p-3 text-sm focus:outline-none focus:border-gray-300 shadow-sm appearance-none">
                                                <option>India</option>
                                                <option>Saudi Arabia</option>
                                                <option>UAE</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2">
                                        <div className="w-5 h-5 rounded bg-[#fbdc3c] flex items-center justify-center cursor-pointer">
                                            <CheckIcon size={12} className="text-black" />
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Make this as a default address</span>
                                    </div>
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

                            <div className="space-y-6 mb-8">
                                {cart.map((item) => (
                                    <div key={item.id} className="flex gap-4 border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                                        <div className="w-16 h-16 bg-white border border-gray-200 rounded-sm p-1 shrink-0">
                                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start gap-2">
                                                <h4 className="text-[12px] font-bold uppercase text-black leading-snug">{item.name}</h4>
                                                <span className="text-[13px] font-semibold shrink-0">{currency} {(item.price * item.quantity).toFixed(0)}</span>
                                            </div>
                                            <div className="text-[11px] font-semibold text-gray-500 border border-gray-200 rounded px-2 py-0.5 inline-block w-fit mt-2">
                                                Qty : {item.quantity}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-4 border-t border-gray-100 pt-6 mb-6">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 font-medium">Sub-Total</span>
                                    <span className="font-semibold text-black">{currency} {subTotal.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 font-medium">Shipping</span>
                                    <span className="font-semibold text-black">{currency} {shippingFee.toFixed(0)}</span>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6 mb-8 flex justify-between items-end">
                                <span className="text-sm font-medium text-gray-600">Total</span>
                                <span className="text-2xl font-black text-black">{currency} {total.toFixed(0)}</span>
                            </div>

                            <button 
                                type="submit"
                                className="w-full bg-[#1a2b25] text-white py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors group"
                            >
                                BUY NOW
                                <ArrowUpRightIcon size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                            </button>

                        </div>
                    </div>

                </form>
            </div>

            {/* Success Modal Overlay */}
            {isOrderComplete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
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
                            <div className="w-16 h-16 bg-[#fbdc3c] rounded-full flex items-center justify-center mb-6">
                                <CheckIcon size={32} className="text-black" />
                            </div>
                            
                            <h2 className="font-heading text-4xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none mb-4 pt-2">
                                Order Completed
                            </h2>
                            <p className="text-sm text-gray-600 mb-8 max-w-[200px] leading-relaxed font-medium">
                                You have successfully placed your order
                            </p>

                            <div className="w-full border border-gray-100 rounded-lg p-5 mb-8 space-y-4 shadow-sm text-left">
                                <div className="flex justify-between items-start border-b border-gray-50 pb-4">
                                    <div>
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                                        <div className="bg-[#fbdc3c] text-black text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                                            Completed <CheckIcon size={12} />
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Order ID</p>
                                        <p className="text-[12px] font-medium text-gray-600">ABLH-9876543210-XYZ</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm font-semibold text-black">
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center"><CheckIcon size={10} /></span>
                                        Date
                                    </div>
                                    <span>01.07.2024</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-semibold text-black">
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center"><Banknote size={10} /></span>
                                        Total
                                    </div>
                                    <span>${total.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-semibold text-black">
                                    <div className="flex items-center gap-2">
                                        <span className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center"><CreditCardIcon size={10} /></span>
                                        Payment
                                    </div>
                                    <span>{paymentMethod === 'credit' ? 'Credit Card' : 'Cash on delivery'}</span>
                                </div>
                            </div>

                            <div className="w-full flex gap-4">
                                <button 
                                    onClick={() => router.push('/')}
                                    className="flex-1 bg-white text-black border border-gray-200 py-3.5 rounded-md font-bold text-[12px] uppercase tracking-wide flex justify-center items-center gap-2 hover:border-black transition-colors"
                                >
                                    BACK HOME
                                    <ArrowUpRightIcon size={14} className="text-gray-400" />
                                </button>
                                <button 
                                    onClick={() => router.push('/track-order')}
                                    className="flex-1 bg-[#1a2b25] text-white py-3.5 rounded-md font-bold text-[12px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors"
                                >
                                    TRACK ORDER
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
