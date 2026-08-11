"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

export default function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const { setUser, language } = useShop();
    const isArabic = language.startsWith('Arabic');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setUser({ name: 'User', email: 'user@example.com' });
        router.push('/');
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
                    
                    <p className={`text-gray-500 mb-10 text-[15px] ${isArabic ? 'text-right' : 'text-left'}`}>
                        {isArabic ? 'ليس لديك حساب بعد؟ ' : "Don't have an account yet? "}
                        <Link href="/register" className="text-black font-bold hover:underline">
                            {isArabic ? 'سجل هنا' : 'Register here'}
                        </Link>
                    </p>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className={`block text-[11px] font-bold text-gray-400 uppercase tracking-wide ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'البريد الإلكتروني' : 'EMAIL'} <span className="text-green-500">*</span>
                            </label>
                            <input 
                                type="email" 
                                required
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

                        <div className="space-y-4 pt-2">
                            <button 
                                type="button"
                                className="w-full bg-white border border-gray-200 rounded p-3.5 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                                <span className="text-[14px] font-medium text-black">
                                    {isArabic ? 'المتابعة باستخدام جوجل' : 'Continue with Google'}
                                </span>
                            </button>
                            
                            <button 
                                type="button"
                                className="w-full bg-white border border-gray-200 rounded p-3.5 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="black">
                                    <path d="M17.05 13.97c-.01-2.48 2.03-3.66 2.12-3.72-1.15-1.68-2.93-1.93-3.58-1.96-1.52-.15-2.97.9-3.75.9-.77 0-1.96-.88-3.21-.86-1.63.03-3.14.95-3.98 2.42-1.7 2.96-.44 7.33 1.22 9.73.8 1.16 1.76 2.45 3.02 2.41 1.21-.04 1.67-.78 3.13-.78 1.45 0 1.88.78 3.14.75 1.29-.03 2.12-1.19 2.92-2.35 1.05-1.54 1.48-3.03 1.5-3.11-.03-.01-2.52-.97-2.53-3.43zm-1.89-6.42c.69-.84 1.16-2.01 1.03-3.18-1.01.04-2.22.67-2.93 1.51-.57.67-1.11 1.87-.96 3.01 1.13.09 2.17-.51 2.86-1.34z"/>
                                </svg>
                                <span className="text-[14px] font-medium text-black">
                                    {isArabic ? 'المتابعة باستخدام فيسبوك' : 'Continue with Facebook'}
                                </span>
                            </button>
                        </div>

                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 border-t border-gray-200"></div>
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{isArabic ? 'أو' : 'OR'}</span>
                            <div className="flex-1 border-t border-gray-200"></div>
                        </div>

                        <button 
                            type="submit"
                            className="w-full bg-[#1a2b25] text-white py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors group"
                        >
                            {isArabic ? 'تسجيل الدخول' : 'SIGN IN'}
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
                            <div className="flex gap-3">
                                <button className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                                    <ChevronLeft size={16} />
                                </button>
                                <button className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
                                    <ChevronLeft size={16} className="rotate-180" />
                                </button>
                            </div>
                        </div>

                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
                            <div className="w-2 h-2 rounded-full bg-white"></div>
                            <div className="w-2 h-2 rounded-full bg-white/30"></div>
                            <div className="w-2 h-2 rounded-full bg-white/30"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

