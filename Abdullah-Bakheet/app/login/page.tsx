"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

function LoginForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect');
    const action = searchParams.get('action');
    const itemId = searchParams.get('item');

    const { login, language } = useShop();
    const isArabic = language.startsWith('Arabic');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage(null);
        try {
            await login(email, password);
            if (redirectUrl) {
                const target = action ? `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}action=${action}${itemId ? `&item=${itemId}` : ''}` : redirectUrl;
                router.push(target);
            } else {
                router.push('/');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Column - Form */}
            <div className="w-full lg:w-1/2 flex flex-col pt-8 pb-12 px-6 sm:px-12 md:px-20 lg:px-24">
                
                <button 
                    onClick={() => router.back()}
                    className={`flex items-center gap-2 text-black hover:text-gray-600 transition-colors w-fit mb-12 ${isArabic ? 'flex-row-reverse self-end' : ''}`}
                >
                    <ChevronLeft size={18} className={isArabic ? 'rotate-180' : ''} />
                    <span className="font-medium text-sm">{isArabic ? 'العودة' : 'Back'}</span>
                </button>

                <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
                    
                    <div className={`bg-[#fbdc3c] py-2 px-4 inline-block w-fit mb-6 ${isArabic ? 'self-end' : ''}`}>
                        <h1 className={`font-heading text-5xl md:text-6xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'تسجيل الدخول' : 'SIGN IN'}
                        </h1>
                    </div>
                    
                    <p className={`text-gray-500 mb-6 text-[15px] ${isArabic ? 'text-right' : 'text-left'}`}>
                        {isArabic ? 'ليس لديك حساب بعد؟ ' : "Don't have an account yet? "}
                        <Link 
                            href={`/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}${action ? `&action=${action}` : ''}${itemId ? `&item=${itemId}` : ''}` : ''}`} 
                            className="text-black font-bold hover:underline"
                        >
                            {isArabic ? 'سجل هنا' : 'Register here'}
                        </Link>
                    </p>

                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-md">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className={`block text-[11px] font-bold text-gray-400 uppercase tracking-wide ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'البريد الإلكتروني' : 'EMAIL'} <span className="text-green-500">*</span>
                            </label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`w-full bg-white border border-gray-200 rounded p-3.5 text-[15px] focus:outline-none focus:border-gray-400 transition-colors ${isArabic ? 'text-right' : 'text-left'}`}
                                placeholder="abc@gmail.com" 
                            />
                        </div>

                        <div className="space-y-2">
                            <label className={`block text-[11px] font-bold text-gray-400 uppercase tracking-wide ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'كلمة المرور' : 'PASSWORD'}
                            </label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full bg-white border border-gray-200 rounded p-3.5 text-[15px] focus:outline-none focus:border-gray-400 transition-colors ${isArabic ? 'pr-3.5 pl-10 text-right' : 'pr-10 text-left'}`}
                                    placeholder="••••••••" 
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${isArabic ? 'left-3' : 'right-3'}`}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            <div className={isArabic ? 'text-left mt-2' : 'text-right mt-2'}>
                                <Link href="#" className="text-red-500 text-[13px] hover:underline">
                                    {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password ?'}
                                </Link>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-[#1a2b25] text-white py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors group disabled:opacity-50"
                        >
                            {isLoading ? (isArabic ? 'جاري التحقق...' : 'SIGNING IN...') : (isArabic ? 'تسجيل الدخول' : 'SIGN IN')}
                            <ArrowUpRight size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Column - Image & Testimonial */}
            <div className="hidden lg:flex w-1/2 relative bg-gray-900 overflow-hidden">
                <img 
                    src="https://images.unsplash.com/photo-1586521995568-39abaa0c2311?q=80&w=2000&auto=format&fit=crop" 
                    alt="Riyadh Skyline" 
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                
                <div className="absolute bottom-12 left-12 right-12">
                    <div className="backdrop-blur-md bg-white/10 border border-white/20 p-10 rounded-xl">
                        <div className="flex justify-between items-start mb-6">
                            <div className="text-white text-6xl font-serif leading-none opacity-80">“</div>
                            <div className="flex gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#fbdc3c" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                    </svg>
                                ))}
                            </div>
                        </div>
                        
                        <p className={`text-white text-xl md:text-2xl font-medium leading-relaxed mb-10 ${isArabic ? 'text-right' : 'text-left'}`}>
                            {isArabic ? 'غيرت المنصة طريقة تخطيطنا وتنفيذنا للمشاريع. إنها بمثابة عضو إضافي في الفريق يعمل على مدار الساعة.' : "The platform transformed how we plan and execute our projects. It's like having an extra team member who never sleeps."}
                        </p>
                        
                        <div className="flex justify-between items-end">
                            <div className={isArabic ? 'text-right' : 'text-left'}>
                                <h4 className="text-white font-bold text-lg">{isArabic ? 'ريتويكا سينغوبتا' : 'Ritwika Sengupta'}</h4>
                                <p className="text-gray-300 text-sm">{isArabic ? 'الرئيس التنفيذي والمؤسس' : 'CEO & Founder, ABC Company'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
            <LoginForm />
        </Suspense>
    );
}
