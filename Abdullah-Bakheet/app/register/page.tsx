"use client";

import React, { useState, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Eye, EyeOff, Building2, UploadCloud, CheckCircle2, Clock, FileText, X } from 'lucide-react';
import { useShop } from '@/context/ShopContext';
import { uploadStorefrontDocumentApi } from '@/lib/api';

const SAUDI_CITIES = [
    'Riyadh',
    'Jeddah',
    'Dammam',
    'Mecca',
    'Medina',
    'Khobar',
    'Dhahran',
    'Tabuk',
    'Jubail',
    'Abha',
    'Taif',
    'Al-Ahsa',
    'Other (GCC / International)'
];

const BUSINESS_TYPES = [
    { id: 'restaurant', label: 'Restaurant / Dining' },
    { id: 'cafe', label: 'Café / Coffee Roastery' },
    { id: 'hotel', label: 'Hotel / Hospitality / Resort' },
    { id: 'supermarket', label: 'Supermarket / Grocery Retail' },
    { id: 'catering', label: 'Catering & Food Services' },
    { id: 'wholesaler', label: 'Wholesaler / Distributor' },
    { id: 'corporate', label: 'Corporate Office / Institution' },
    { id: 'other', label: 'Other Commercial Entity' }
];

function RegisterForm() {
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect');
    const action = searchParams.get('action');
    const itemId = searchParams.get('item');
    const isCorporate = searchParams.get('type') === 'corporate';
    const initialEmail = searchParams.get('email') || '';
    const initialName = searchParams.get('name') || searchParams.get('firstName') || '';
    const initialPhone = searchParams.get('phone') || '';
    const initialCompany = searchParams.get('company') || '';

    // Standard Fields
    const [firstName, setFirstName] = useState(initialName.split(' ')[0] || '');
    const [lastName, setLastName] = useState(initialName.split(' ').slice(1).join(' ') || '');
    const [email, setEmail] = useState(initialEmail);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // B2B Corporate Fields
    const [companyName, setCompanyName] = useState(initialCompany);
    const [crNumber, setCrNumber] = useState('');
    const [companyTaxId, setCompanyTaxId] = useState('');
    const [businessType, setBusinessType] = useState('restaurant');
    const [city, setCity] = useState('Riyadh');
    const [phoneRaw, setPhoneRaw] = useState(initialPhone.replace('+966', '').replace(/\s+/g, ''));
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [crDocumentUrl, setCrDocumentUrl] = useState('');
    const [documentName, setDocumentName] = useState('');
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);

    // Status & UI States
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmittedPending, setIsSubmittedPending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const router = useRouter();
    const { register } = useShop();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage('Document file size must be less than 10MB.');
            return;
        }

        setIsUploadingDoc(true);
        setErrorMessage(null);
        try {
            const uploaded = await uploadStorefrontDocumentApi(file);
            setCrDocumentUrl(uploaded.url);
            setDocumentName(uploaded.filename || file.name);
        } catch (err: any) {
            setErrorMessage(err.message || 'Failed to upload document. You can still submit and email it later.');
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setErrorMessage('Passwords do not match');
            return;
        }

        if (isCorporate) {
            if (!companyName.trim()) {
                setErrorMessage('Please enter your Company / Business name');
                return;
            }
            if (crNumber && !/^\d{10}$/.test(crNumber.trim())) {
                setErrorMessage('CR Number must be a 10-digit number (Ministry of Commerce).');
                return;
            }
            if (companyTaxId && !/^\d{15}$/.test(companyTaxId.trim())) {
                setErrorMessage('VAT Number must be a 15-digit ZATCA tax number.');
                return;
            }
        }

        setIsLoading(true);
        setErrorMessage(null);
        try {
            const formattedPhone = isCorporate ? `+966${phoneRaw.replace(/^0+/, '').replace(/\s+/g, '')}` : phoneRaw;

            const res = await register({ 
                firstName, 
                lastName, 
                email, 
                phone: formattedPhone, 
                password,
                companyName: isCorporate ? companyName : undefined,
                companyTaxId: isCorporate ? companyTaxId : undefined,
                crNumber: isCorporate ? crNumber : undefined,
                businessType: isCorporate ? businessType : undefined,
                city: isCorporate ? city : undefined,
                deliveryAddress: isCorporate ? deliveryAddress : undefined,
                crDocumentUrl: isCorporate ? crDocumentUrl : undefined,
                customerGroup: isCorporate ? 'corporate' : 'retail',
            });

            if (isCorporate && res?.customer?.status === 'pending') {
                setIsSubmittedPending(true);
            } else if (redirectUrl) {
                const target = action ? `${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}action=${action}${itemId ? `&item=${itemId}` : ''}` : redirectUrl;
                router.push(target);
            } else {
                router.push('/');
            }
        } catch (err: any) {
            setErrorMessage(err.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Pending Approval Screen
    if (isSubmittedPending) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200/80 p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-200">
                        <Clock className="w-8 h-8 text-amber-600" />
                    </div>

                    <div className="bg-[#fbdc3c] py-1.5 px-3 inline-block rounded mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-black">Application Under Review</span>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Submitted!</h2>
                    
                    <p className="text-sm text-gray-600 leading-relaxed mb-6">
                        Thank you for applying for a corporate wholesale account for <strong>{companyName}</strong>.
                    </p>

                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-left text-xs space-y-2 mb-6">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Contact:</span>
                            <span className="font-semibold text-gray-900">{firstName} {lastName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Business Email:</span>
                            <span className="font-semibold text-gray-900">{email}</span>
                        </div>
                        {crNumber && (
                            <div className="flex justify-between">
                                <span className="text-gray-500">CR Number:</span>
                                <span className="font-mono font-semibold text-gray-900">{crNumber}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-gray-500">Review Status:</span>
                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                Pending Verification
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-6">
                        Our commercial compliance desk will verify your CR and VAT credentials. You will receive an automated email confirmation as soon as your wholesale tier is approved.
                    </p>

                    <div className="space-y-3">
                        <Link 
                            href="/"
                            className="block w-full py-3 bg-black hover:bg-gray-800 text-white rounded font-medium text-sm transition-colors"
                        >
                            Return to Homepage
                        </Link>
                        <Link 
                            href="/products"
                            className="block w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium text-xs transition-colors"
                        >
                            Browse Products as Guest
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex">
            {/* Left Column - Form */}
            <div className="w-full lg:w-1/2 flex flex-col pt-8 pb-12 px-6 sm:px-12 md:px-20 lg:px-24">
                
                <button 
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-black hover:text-gray-600 transition-colors w-fit mb-8"
                >
                    <ChevronLeft size={18} />
                    <span className="font-medium text-sm">Back</span>
                </button>

                <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
                    
                    <div className="bg-[#fbdc3c] py-2 px-4 inline-block w-fit mb-4">
                        <h1 className="font-heading text-4xl sm:text-5xl uppercase tracking-normal text-black transform scale-y-110 origin-bottom leading-none pt-2">
                            {isCorporate ? 'BUSINESS REGISTRATION' : 'CREATE ACCOUNT'}
                        </h1>
                    </div>
                    
                    <p className="text-gray-500 mb-4 text-[14px]">
                        {isCorporate ? (
                            <>
                                Already registered your business? <Link href={`/login?type=corporate${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}${action ? `&action=${action}` : ''}${itemId ? `&item=${itemId}` : ''}` : ''}`} className="text-black font-bold hover:underline">Business sign in</Link>
                            </>
                        ) : (
                            <>
                                Already have an account? <Link href={`/login${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}${action ? `&action=${action}` : ''}${itemId ? `&item=${itemId}` : ''}` : ''}`} className="text-black font-bold hover:underline">Sign in</Link>
                            </>
                        )}
                    </p>

                    <div className="border-t border-gray-100 pt-3 pb-1 flex items-center justify-between text-[12px] mb-5">
                        {isCorporate ? (
                            <>
                                <div>
                                    <p className="font-medium text-gray-700">Looking for personal registration?</p>
                                    <p className="text-gray-400 text-[11px]">Register an individual account for personal shopping</p>
                                </div>
                                <Link 
                                    href={`/register${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
                                    className="text-xs font-semibold text-gray-900 hover:underline whitespace-nowrap ml-3"
                                >
                                    Personal register →
                                </Link>
                            </>
                        ) : (
                            <>
                                <div>
                                    <p className="font-medium text-gray-700">Purchasing for a company or business?</p>
                                    <p className="text-gray-400 text-[11px]">Register for wholesale pricing and corporate credit terms</p>
                                </div>
                                <Link 
                                    href={`/register?type=corporate${redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
                                    className="text-xs font-semibold text-gray-900 hover:underline whitespace-nowrap ml-3"
                                >
                                    Business register →
                                </Link>
                            </>
                        )}
                    </div>

                    {isCorporate && (
                        <div className="mb-5 p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                            <Building2 className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold text-amber-950">B2B Wholesale Onboarding:</span> Accounts are verified with Ministry of Commerce CR credentials to unlock wholesale volume tiering and commercial payment terms.
                            </div>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-md">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5">
                        {isCorporate && (
                            <div className="space-y-4 pt-1">
                                {/* Company Name */}
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                        COMPANY / LEGAL ENTITY NAME <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        required
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
                                        placeholder="e.g. Al Safwa Food Catering LLC" 
                                    />
                                </div>

                                {/* CR Number & VAT Number */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                            CR NUMBER (السجل التجاري)
                                        </label>
                                        <input 
                                            type="text" 
                                            maxLength={10}
                                            value={crNumber}
                                            onChange={(e) => setCrNumber(e.target.value.replace(/\D/g, ''))}
                                            className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] font-mono focus:outline-none focus:border-gray-400 transition-colors"
                                            placeholder="1010XXXXXX (10 digits)" 
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                            VAT NUMBER (الرقم الضريبي)
                                        </label>
                                        <input 
                                            type="text" 
                                            maxLength={15}
                                            value={companyTaxId}
                                            onChange={(e) => setCompanyTaxId(e.target.value.replace(/\D/g, ''))}
                                            className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] font-mono focus:outline-none focus:border-gray-400 transition-colors"
                                            placeholder="300XXXXXXXXXXX3 (15 digits)" 
                                        />
                                    </div>
                                </div>

                                {/* Business Type & City */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                            BUSINESS TYPE <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={businessType}
                                            onChange={(e) => setBusinessType(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors cursor-pointer"
                                        >
                                            {BUSINESS_TYPES.map((bt) => (
                                                <option key={bt.id} value={bt.id}>{bt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                            CITY <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors cursor-pointer"
                                        >
                                            {SAUDI_CITIES.map((c) => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Delivery / Warehouse Address */}
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                        DELIVERY / RECEIVING FACILITY ADDRESS
                                    </label>
                                    <input 
                                        type="text" 
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
                                        placeholder="Street, District, Warehouse / Dock #" 
                                    />
                                </div>

                                {/* Optional CR / VAT Document Upload */}
                                <div className="space-y-1.5 pt-1">
                                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                        CR / VAT CERTIFICATE DOCUMENT <span className="text-gray-400 font-normal">(OPTIONAL)</span>
                                    </label>
                                    <input 
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        className="hidden"
                                    />
                                    {documentName ? (
                                        <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-800">
                                            <div className="flex items-center gap-2 overflow-hidden pr-2">
                                                <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                                                <span className="truncate font-medium">{documentName}</span>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => { setDocumentName(''); setCrDocumentUrl(''); }}
                                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={isUploadingDoc}
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-full border border-dashed border-gray-300 rounded p-3 text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                        >
                                            <UploadCloud className="w-4 h-4 text-gray-400" />
                                            <span>{isUploadingDoc ? 'Uploading certificate...' : 'Upload CR Certificate (PDF or Image, max 10MB)'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Contact Person Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                    {isCorporate ? 'CONTACT FIRST NAME' : 'FIRST NAME'} <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
                                    placeholder="First Name" 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                    {isCorporate ? 'CONTACT LAST NAME' : 'LAST NAME'} <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
                                    placeholder="Last Name" 
                                />
                            </div>
                        </div>

                        {/* Business Email */}
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                {isCorporate ? 'BUSINESS EMAIL' : 'EMAIL'} <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
                                placeholder={isCorporate ? "procurement@company.com" : "you@example.com"} 
                            />
                        </div>

                        {/* Mobile Number (+966 for Corporate) */}
                        <div className="space-y-1.5">
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                {isCorporate ? 'MOBILE (+966)' : 'PHONE NUMBER'} <span className="text-red-500">*</span>
                            </label>
                            {isCorporate ? (
                                <div className="flex rounded border border-gray-200 focus-within:border-gray-400 transition-colors">
                                    <span className="inline-flex items-center px-3 bg-gray-50 border-r border-gray-200 text-xs font-semibold text-gray-600 select-none">
                                        🇸🇦 +966
                                    </span>
                                    <input 
                                        type="tel" 
                                        required
                                        maxLength={10}
                                        value={phoneRaw}
                                        onChange={(e) => setPhoneRaw(e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-white p-3 text-[14px] focus:outline-none rounded-r"
                                        placeholder="50 123 4567" 
                                    />
                                </div>
                            ) : (
                                <input 
                                    type="tel" 
                                    value={phoneRaw}
                                    onChange={(e) => setPhoneRaw(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors"
                                    placeholder="+966 50 123 4567" 
                                />
                            )}
                        </div>

                        {/* Password & Confirm Password */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                    PASSWORD <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showPassword ? "text" : "password"} 
                                        required
                                        minLength={6}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors pr-10"
                                        placeholder="••••••••" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">
                                    CONFIRM PASSWORD <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        required
                                        minLength={6}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded p-3 text-[14px] focus:outline-none focus:border-gray-400 transition-colors pr-10"
                                        placeholder="••••••••" 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button 
                            type="submit" 
                            disabled={isLoading || isUploadingDoc}
                            className="w-full bg-black text-white hover:bg-gray-800 transition-colors py-3.5 px-4 font-bold tracking-wider text-xs uppercase cursor-pointer rounded flex items-center justify-center gap-2 mt-4"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                <span>{isCorporate ? 'Submit Business Application' : 'Create Account'}</span>
                            )}
                        </button>
                    </form>

                </div>
            </div>

            {/* Right Column - Visual Branding */}
            <div className="hidden lg:block lg:w-1/2 relative bg-zinc-950 overflow-hidden">
                <img 
                    src="https://pub-2ba7d836ec824f9096f19eb3bcbaa81e.r2.dev/products/extra-virgin-olive-oil.jpg" 
                    alt="Abdullah Bakheet Commercial Wholesale" 
                    className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity filter contrast-125"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent flex flex-col justify-end p-16 text-white">
                    <div className="bg-[#fbdc3c] text-black font-bold text-xs uppercase tracking-widest py-1 px-3 rounded w-fit mb-4">
                        B2B Partner Portal
                    </div>
                    <h3 className="font-heading text-4xl uppercase tracking-wide leading-tight mb-3">
                        Wholesale Distribution Across Saudi Arabia & UAE
                    </h3>
                    <p className="text-gray-300 text-sm max-w-lg leading-relaxed">
                        Supplying premium olive oils, dates, spices, and gourmet foods to leading hotels, restaurants, supermarkets, and corporate facilities.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            </div>
        }>
            <RegisterForm />
        </Suspense>
    );
}
