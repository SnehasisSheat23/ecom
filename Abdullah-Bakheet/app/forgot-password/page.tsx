"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle2, ArrowRight, ArrowUpRight } from 'lucide-react';
import { requestPasswordReset } from '@/lib/auth-client';
import { useShop } from '@/context/ShopContext';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const router = useRouter();
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage(null);

        try {
            const redirectUrl = typeof window !== 'undefined' 
                ? `${window.location.origin}/reset-password` 
                : '/reset-password';

            const res = await requestPasswordReset({
                email: email.trim().toLowerCase(),
                redirectTo: redirectUrl,
            });

            if (res?.error) {
                throw new Error(res.error.message || 'Failed to send reset email');
            }

            setIsSubmitted(true);
        } catch (err: any) {
            setErrorMessage(err.message || 'Unable to request password reset. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            <div className="w-full lg:w-1/2 flex flex-col pt-8 pb-12 px-6 sm:px-12 md:px-20 lg:px-24">
                <button 
                    onClick={() => router.back()}
                    className={`flex items-center gap-2 text-black hover:text-gray-600 transition-colors w-fit mb-12 ${isArabic ? 'flex-row-reverse self-end' : ''}`}
                >
                    <ChevronLeft size={18} className={isArabic ? 'rotate-180' : ''} />
                    <span className="font-medium text-sm">{isArabic ? 'العودة' : 'Back'}</span>
                </button>

                <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
                    <div className={`py-2 px-4 inline-block w-fit mb-6 ${isArabic ? 'self-end' : ''}`}>
                        <h1 className={`font-heading text-5xl md:text-6xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'استعادة كلمة المرور' : 'RESET PASSWORD'}
                        </h1>
                    </div>

                    {isSubmitted ? (
                        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-4">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-emerald-950">
                                {isArabic ? 'تم إرسال رابط الاستعادة!' : 'Reset Link Sent!'}
                            </h2>
                            <p className="text-sm text-emerald-800 leading-relaxed">
                                {isArabic 
                                    ? `لقد أرسلنا رابط إعادة تعيين كلمة المرور إلى ${email}. يرجى التحقق من صندوق الوارد الخاص بك.`
                                    : `We have sent a secure password reset link to ${email}. Please check your inbox and spam folder.`}
                            </p>
                            <div className="pt-2">
                                <Link 
                                    href="/login"
                                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-black bg-white hover:bg-gray-50 border border-gray-300 px-5 py-2.5 rounded shadow-xs"
                                >
                                    <span>{isArabic ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className={`text-gray-500 mb-8 text-[15px] ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic 
                                    ? 'أدخل عنوان بريدك الإلكتروني المسجل وسنرسل لك رابطاً لإعادة تعيين كلمة المرور الخاصة بك.'
                                    : 'Enter your registered email address and we will send you a secure link to reset your password.'}
                            </p>

                            {errorMessage && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-md">
                                    {errorMessage}
                                </div>
                            )}

                            <form onSubmit={handleForgotPassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className={`block text-[11px] font-bold text-gray-400 uppercase tracking-wide ${isArabic ? 'text-right' : 'text-left'}`}>
                                        {isArabic ? 'البريد الإلكتروني' : 'EMAIL ADDRESS'} <span className="text-green-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="email" 
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`w-full bg-white border border-gray-200 rounded p-3.5 text-[15px] focus:outline-none focus:border-gray-400 transition-colors ${isArabic ? 'text-right' : 'text-left'}`}
                                            placeholder="you@company.com" 
                                        />
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-[#1a2b25] text-white py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors group disabled:opacity-50"
                                >
                                    {isLoading ? (isArabic ? 'جاري الإرسال...' : 'SENDING LINK...') : (isArabic ? 'إرسال رابط الاستعادة' : 'SEND RESET LINK')}
                                    <ArrowUpRight size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {/* Right Column - Hero Graphic Image matching Login & Admin Panel */}
            <div className="hidden lg:relative lg:flex w-1/2 items-end justify-start p-12 overflow-hidden bg-zinc-950">
                <img 
                    src="/images/riyadh_hero_3.webp" 
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
