"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff, ArrowUpRight } from 'lucide-react';
import { useShop } from '@/context/ShopContext';

function LoginForm() {
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect');
    const action = searchParams.get('action');
    const itemId = searchParams.get('item');
    const isCorporate = searchParams.get('type') === 'corporate';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const router = useRouter();

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
                            {isCorporate ? (isArabic ? 'دخول الشركات' : 'BUSINESS SIGN IN') : (isArabic ? 'تسجيل الدخول' : 'SIGN IN')}
                        </h1>
                    </div>
                    
                    <p className={`text-gray-500 mb-5 text-[15px] ${isArabic ? 'text-right' : 'text-left'}`}>
                        {isCorporate ? (
                            <>
                                {isArabic ? 'ليس لديك حساب تجاري؟ ' : "Don't have a business account? "}
                                <Link 
                                    href={`/register?type=corporate${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}${action ? `&action=${action}` : ''}${itemId ? `&item=${itemId}` : ''}` : ''}`} 
                                    className="text-black font-bold hover:underline"
                                >
                                    {isArabic ? 'سجل حساب شركة' : 'Register business account'}
                                </Link>
                            </>
                        ) : (
                            <>
                                {isArabic ? 'ليس لديك حساب بعد؟ ' : "Don't have an account yet? "}
                                <Link 
                                    href={`/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}${action ? `&action=${action}` : ''}${itemId ? `&item=${itemId}` : ''}` : ''}`} 
                                    className="text-black font-bold hover:underline"
                                >
                                    {isArabic ? 'سجل هنا' : 'Register here'}
                                </Link>
                            </>
                        )}
                    </p>

                    <div className="border-t border-gray-100 pt-3 pb-1 flex items-center justify-between text-[12px] mb-6">
                        {isCorporate ? (
                            <>
                                <div>
                                    <p className="font-medium text-gray-700">
                                        {isArabic ? 'تسجيل دخول الحساب الشخصي؟' : 'Looking for personal account?'}
                                    </p>
                                    <p className="text-gray-400 text-[11px]">
                                        {isArabic ? 'تسجيل الدخول للأفراد والطلبات العادية' : 'Sign in for retail & consumer checkout'}
                                    </p>
                                </div>
                                <Link 
                                    href={`/login${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
                                    className="text-xs font-semibold text-gray-900 hover:underline whitespace-nowrap ml-3"
                                >
                                    {isArabic ? 'دخول أفراد ←' : 'Personal sign in →'}
                                </Link>
                            </>
                        ) : (
                            <>
                                <div>
                                    <p className="font-medium text-gray-700">
                                        {isArabic ? 'تشتري لشركة أو جهة تجارية؟' : 'Purchasing for a company or business?'}
                                    </p>
                                    <p className="text-gray-400 text-[11px]">
                                        {isArabic ? 'سجل للوصول لتسهيلات الدفع وأسعار الجملة' : 'Access wholesale pricing and corporate credit terms'}
                                    </p>
                                </div>
                                <Link 
                                    href={`/login?type=corporate${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
                                    className="text-xs font-semibold text-gray-900 hover:underline whitespace-nowrap ml-3"
                                >
                                    {isArabic ? 'دخول شركات ←' : 'Business sign in →'}
                                </Link>
                            </>
                        )}
                    </div>

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

            {/* Right Column - Hero Graphic Image matching Admin Panel */}
            <div className="hidden lg:relative lg:flex w-1/2 items-end justify-start p-12 overflow-hidden bg-zinc-950">
                <img 
                    src="/images/riyadh_hero_3.png" 
                    alt="Abdullah Bakheet Riyadh Operations" 
                    className="absolute inset-0 w-full h-full object-cover object-center opacity-85"
                />
                {/* Modern dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />
                
                {/* Hero Content Card */}
                <div className={`relative z-10 max-w-lg text-white space-y-3 ${isArabic ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-flex items-center gap-2 text-xs  ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <span className="font-semibold tracking-wider ">
                            {isArabic ? 'شركة عبدالله بخيت للتجارة' : 'Abdullah Bakheet Co.'}
                        </span>
                    </div>
                    <h2 className="text-xl font-semibold  text-white ">
                        {isArabic ? 'أفضل شركة تجارية في المملكة العربية السعودية، الرياض' : 'BEST TRADING COMPANY IN SAUDI ARABIA, RIYADH'}
                    </h2>
                    <p className="text-sm text-zinc-200 leading-relaxed font-normal">
                        {isArabic 
                            ? 'تأسست الشركة في عام 2004، وبنينا سمعة راسخة في توفير المستلزمات الغذائية للمطاعم والفنادق وشركات الإعاشة وتجار الجملة في جميع أنحاء المملكة. مع أكثر من عقدين من الخبرة في هذا القطاع، طورنا شراكات طويلة الأمد مع كبرى العلامات التجارية العالمية.'
                            : 'Established in 2004, we have built a strong reputation for providing food essentials to restaurants, hotels, caterers, and wholesalers across the Kingdom. With over two decades of industry expertise, we have cultivated long-term relationships with top international brands.'
                        }
                    </p>
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
