"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, CheckCircle2, ChevronLeft, ArrowUpRight } from 'lucide-react';
import { resetPassword } from '@/lib/auth-client';
import { useShop } from '@/context/ShopContext';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const token = searchParams.get('token') || '';
    const errorParam = searchParams.get('error');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(
        errorParam === 'invalid_token' ? 'This password reset link is invalid or has expired.' : null
    );

    const router = useRouter();
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setErrorMessage(isArabic ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setErrorMessage(isArabic ? 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل' : 'Password must be at least 6 characters');
            return;
        }

        if (!token) {
            setErrorMessage(isArabic ? 'رمز الاستعادة غير صالح أو مفقود' : 'Reset token is missing or invalid.');
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const res = await resetPassword({
                newPassword: password,
                token,
            });

            if (res?.error) {
                throw new Error(res.error.message || 'Failed to update password');
            }

            setIsSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 2500);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to reset password. The link may have expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Column - Form */}
            <div className="w-full lg:w-1/2 flex flex-col pt-8 pb-12 px-6 sm:px-12 md:px-20 lg:px-24">
                <button 
                    onClick={() => router.push('/login')}
                    className={`flex items-center gap-2 text-black hover:text-gray-600 transition-colors w-fit mb-12 ${isArabic ? 'flex-row-reverse self-end' : ''}`}
                >
                    <ChevronLeft size={18} className={isArabic ? 'rotate-180' : ''} />
                    <span className="font-medium text-sm">{isArabic ? 'العودة لتسجيل الدخول' : 'Back to Sign In'}</span>
                </button>

                <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
                    <div className={`py-2 px-4 inline-block w-fit mb-6 ${isArabic ? 'self-end' : ''}`}>
                        <h1 className={`font-heading text-5xl md:text-6xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'تعيين كلمة المرور' : 'RESET PASSWORD'}
                        </h1>
                    </div>

                    {isSuccess ? (
                        <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-4">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-6 h-6" />
                            </div>
                            <h2 className="text-lg font-bold text-emerald-950">
                                {isArabic ? 'تم تحديث كلمة المرور بنجاح!' : 'Password Updated!'}
                            </h2>
                            <p className="text-sm text-emerald-800 leading-relaxed">
                                {isArabic 
                                    ? 'تم تغيير كلمة المرور الخاصة بك. جاري تحويلك إلى صفحة تسجيل الدخول...'
                                    : 'Your password has been successfully reset. Redirecting you to sign in...'}
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className={`text-gray-500 mb-8 text-[15px] ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic 
                                    ? 'أدخل كلمة المرور الجديدة القوية لحسابك أدناه.'
                                    : 'Please choose a new secure password for your account below.'}
                            </p>

                            {errorMessage && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-md">
                                    {errorMessage}
                                </div>
                            )}

                            <form onSubmit={handleReset} className="space-y-6">
                                <div className="space-y-2">
                                    <label className={`block text-[11px] font-bold text-gray-400 uppercase tracking-wide ${isArabic ? 'text-right' : 'text-left'}`}>
                                        {isArabic ? 'كلمة المرور الجديدة' : 'NEW PASSWORD'} <span className="text-green-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type={showPassword ? "text" : "password"} 
                                            required
                                            minLength={6}
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
                                </div>

                                <div className="space-y-2">
                                    <label className={`block text-[11px] font-bold text-gray-400 uppercase tracking-wide ${isArabic ? 'text-right' : 'text-left'}`}>
                                        {isArabic ? 'تأكيد كلمة المرور الجديدة' : 'CONFIRM NEW PASSWORD'} <span className="text-green-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            required
                                            minLength={6}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`w-full bg-white border border-gray-200 rounded p-3.5 text-[15px] focus:outline-none focus:border-gray-400 transition-colors ${isArabic ? 'pr-3.5 pl-10 text-right' : 'pr-10 text-left'}`}
                                            placeholder="••••••••" 
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 ${isArabic ? 'left-3' : 'right-3'}`}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-[#1a2b25] text-white py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors group disabled:opacity-50"
                                >
                                    {isLoading ? (isArabic ? 'جاري الحفظ...' : 'SAVING PASSWORD...') : (isArabic ? 'تحديث كلمة المرور' : 'UPDATE PASSWORD')}
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

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white" />}>
            <ResetPasswordForm />
        </Suspense>
    );
}
