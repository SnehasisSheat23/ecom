"use client";

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    BoxIcon,
    CartIcon,
    ChevronDownIcon,
    DollarSignIcon,
    EarthIcon,
    HeartIcon,
    HomeIcon,
    IdCardIcon,
    PhoneCallIcon,
    TruckIcon,
    UserIcon,
    UsersIcon,
    MenuIcon,
    XIcon,
    SearchIcon,
} from 'lucide-animated';
import { cn } from '@/lib/utils';
import { useShop } from '@/context/ShopContext';

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const [currDropdownOpen, setCurrDropdownOpen] = useState(false);

    const pathname = usePathname();

    const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

    const {
        cartCount,
        wishlistCount,
        setIsCartOpen,
        setIsWishlistOpen,
        setIsSearchOpen,
        setIsAccountOpen,
        language,
        setLanguage,
        currency,
        setCurrency,
        user,
        isCorporateUser,
        logout,
    } = useShop();

    const isArabic = language.startsWith('Arabic');

    const navLinks = [
        { href: '/', label: isArabic ? 'الرئيسية' : 'Home', icon: HomeIcon },
        { href: '/products', label: isArabic ? 'المنتجات' : 'Products', icon: BoxIcon },
        { href: '/about', label: isArabic ? 'من نحن' : 'About Us', icon: UsersIcon },
        { href: '/contact', label: isArabic ? 'تواصل معنا' : 'Contact Us', icon: IdCardIcon },
    ];

    const languages = ['English', 'Arabic (العربية)'];
    const currencies = ['SAR', 'AED', 'USD', 'EUR', 'INR'];

    const getCurrencyLabel = (c: string) => {
        if (c === 'SAR') return isArabic ? 'ر.س (SAR)' : 'SAR';
        if (c === 'AED') return isArabic ? 'د.إ (AED)' : 'AED';
        return c;
    };

    const isActive = (href: string) => {
        if (href === '/') {
            return pathname === '/';
        }
        return pathname.startsWith(href);
    };

    return (
        <header className={cn('w-full flex flex-col font-sans sticky top-0 z-50 bg-white')}>
            {/* Top Utility Bar - Hidden on Mobile */}
            <div className="hidden md:block w-full bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex justify-between items-center">

                    {/* Left Side: Language & Currency */}
                    <div className="flex items-center gap-6 text-sm text-gray-800">
                        {/* Language Selector Dropdown */}
                        <div className="flex items-center gap-2 relative">
                            <span className="text-gray-600">{isArabic ? 'اللغة' : 'Language'}</span>
                            <button 
                                onClick={() => {
                                    setLangDropdownOpen(!langDropdownOpen);
                                    setCurrDropdownOpen(false);
                                }}
                                className={cn('flex items-center gap-2 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer')}
                            >
                                <EarthIcon size={16} className="text-gray-600" />
                                <span className="font-medium">{language}</span>
                                <ChevronDownIcon size={14} className={cn("text-gray-400 transition-transform", langDropdownOpen && "rotate-180")} />
                            </button>

                            {langDropdownOpen && (
                                <div className="absolute top-full left-16 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
                                    {languages.map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => {
                                                setLanguage(lang);
                                                setLangDropdownOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors",
                                                language === lang ? "text-brand-dark font-bold bg-gray-50" : "text-gray-700"
                                            )}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Currency Selector Dropdown */}
                        <div className="flex items-center gap-2 relative">
                            <span className="text-gray-600">{isArabic ? 'العملة' : 'Currency'}</span>
                            <button 
                                onClick={() => {
                                    setCurrDropdownOpen(!currDropdownOpen);
                                    setLangDropdownOpen(false);
                                }}
                                className={cn('flex items-center gap-2 border border-gray-200 rounded-md px-3 py-1.5 hover:bg-gray-50 transition-colors cursor-pointer')}
                            >
                                <div className="bg-[#85b821] text-white rounded-full w-4 h-4 flex items-center justify-center">
                                    <DollarSignIcon size={12} />
                                </div>
                                <span className="font-medium">{getCurrencyLabel(currency)}</span>
                                <ChevronDownIcon size={14} className={cn("text-gray-400 transition-transform", currDropdownOpen && "rotate-180")} />
                            </button>

                            {currDropdownOpen && (
                                <div className="absolute top-full left-16 mt-1 w-28 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
                                    {currencies.map((curr) => (
                                        <button
                                            key={curr}
                                            onClick={() => {
                                                setCurrency(curr);
                                                setCurrDropdownOpen(false);
                                            }}
                                            className={cn(
                                                "w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-gray-50 transition-colors",
                                                currency === curr ? "text-brand-dark font-bold bg-gray-50" : "text-gray-700"
                                            )}
                                        >
                                            {getCurrencyLabel(curr)}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Support & Track Order */}
                    <div className="flex items-center gap-4 text-sm">
                        <Link
                            href="/support"
                            className={cn('flex items-center gap-2 border border-gray-200 rounded-md px-4 py-1.5 hover:bg-gray-50 transition-colors')}
                        >
                            <PhoneCallIcon size={16} className="text-gray-700" />
                            <span className="font-medium text-gray-800">{isArabic ? 'الدعم' : 'Support'}</span>
                        </Link>
                        <Link
                            href="/track-order"
                            className={cn('flex items-center gap-2 border border-gray-200 rounded-md px-4 py-1.5 hover:bg-gray-50 transition-colors')}
                        >
                            <TruckIcon size={16} className="text-gray-700" />
                            <span className="font-medium text-gray-800">{isArabic ? 'تتبع الطلب' : 'Track Order'}</span>
                        </Link>
                    </div>

                </div>
            </div>

            {/* Main Navigation Bar */}
            <nav className="w-full bg-brand-dark text-white">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex justify-between items-center">

                    {/* Left Side: Navigation Links - Desktop Only */}
                    <div className="hidden lg:flex items-center gap-1">
                        {navLinks.map((link) => {
                            const active = isActive(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={cn(
                                        'flex items-center gap-2 px-4 py-2 transition-all border-b-2',
                                        active
                                            ? 'text-white border-b-2 border-white'
                                            : 'text-gray-300 border-b-2 border-transparent hover:text-white hover:border-white'
                                    )}
                                >
                                    <link.icon size={18} />
                                    <span className="font-medium">{link.label}</span>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Right Side: Account & Cart Icons + Mobile Menu Button */}
                    <div className="flex items-center gap-6 ml-auto lg:ml-0">
                        {/* Search Icon Trigger */}
                        <button 
                            onClick={() => setIsSearchOpen(true)}
                            className={cn('text-white hover:text-gray-300 transition-colors cursor-pointer')}
                            title="Search Products"
                        >
                            <SearchIcon size={22} className="text-white" />
                        </button>

                        {/* User Account Link & Dropdown */}
                        <div className="relative">
                            {user ? (
                                <div>
                                    <button 
                                        onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                                        className={cn('text-white hover:text-gray-300 transition-colors cursor-pointer flex items-center gap-2 text-xs font-semibold')}
                                        title={`Logged in as ${user.name}`}
                                    >
                                        <div className="relative">
                                            <UserIcon size={22} className="text-white" />
                                            <span className="absolute -top-1 -right-1 bg-green-500 w-2.5 h-2.5 rounded-full border-2 border-brand-dark" />
                                        </div>
                                        <span className="hidden sm:inline max-w-[110px] truncate">{user.name}</span>
                                        {isCorporateUser && (
                                            <span className="hidden md:inline-block text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                                {isArabic ? 'شركات' : 'Corporate'}
                                            </span>
                                        )}
                                    </button>
                                    {accountDropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-50 text-gray-900">
                                            <div className="px-4 py-2.5 border-b border-gray-100">
                                                <p className="text-xs font-bold truncate">{user.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                                                {isCorporateUser && (
                                                    <span className="inline-block mt-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                                        {user.companyName || (isArabic ? 'حساب شركات معتمد' : 'Corporate Account')}
                                                    </span>
                                                )}
                                            </div>
                                            <Link
                                                href="/account"
                                                onClick={() => setAccountDropdownOpen(false)}
                                                className="block w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                                            >
                                                {isArabic ? 'حسابي / الملف الشخصي' : 'My Profile'}
                                            </Link>
                                            <div className="border-t border-gray-100 my-1" />
                                            <button
                                                onClick={() => {
                                                    logout();
                                                    setAccountDropdownOpen(false);
                                                }}
                                                className="w-full text-left px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                {isArabic ? 'تسجيل الخروج' : 'Sign Out'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <Link 
                                    href="/login"
                                    className={cn('text-white hover:text-gray-300 transition-colors cursor-pointer relative block')}
                                    title="Sign In"
                                >
                                    <UserIcon size={22} className="text-white" />
                                </Link>
                            )}
                        </div>

                        {/* Wishlist Icon Link */}
                        <Link 
                            href="/wishlist"
                            className={cn('relative text-white hover:text-gray-300 transition-colors cursor-pointer')}
                            title="Wishlist"
                        >
                            <HeartIcon size={22} className="text-white" />
                            {wishlistCount > 0 && (
                                <span className="absolute -top-1.5 -right-2 bg-white text-brand-dark text-[9px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center">
                                    {wishlistCount}
                                </span>
                            )}
                        </Link>

                        {/* Shopping Cart Icon Link */}
                        <Link 
                            href="/cart"
                            className={cn('relative text-white hover:text-gray-300 transition-colors cursor-pointer inline-flex items-center')}
                            title="Shopping Cart"
                        >
                            <CartIcon size={22} className="text-white" />
                            {cartCount > 0 && (
                                <span className="absolute -top-2 -right-2.5 bg-white text-brand-dark text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-sm leading-none">
                                    {cartCount > 999 ? '999+' : cartCount}
                                </span>
                            )}
                        </Link>

                        {/* Hamburger Menu Button - Mobile Only */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className={cn('lg:hidden text-white hover:text-gray-300 transition-colors ml-2 cursor-pointer')}
                        >
                            {mobileMenuOpen ? (
                                <XIcon size={24} />
                            ) : (
                                <MenuIcon size={24} />
                            )}
                        </button>
                    </div>

                </div>

                {/* Mobile Navigation Menu */}
                {mobileMenuOpen && (
                    <div className="lg:hidden bg-brand-dark border-t border-white/10">
                        <div className="px-4 py-4 space-y-2">
                            {navLinks.map((link) => {
                                const active = isActive(link.href);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={cn(
                                            'flex items-center gap-3 px-4 py-3 rounded-md w-full transition-all',
                                            active
                                                ? 'text-white bg-white/10 border-l-4 border-white'
                                                : 'text-gray-300 hover:text-white hover:bg-white/5 border-l-4 border-transparent'
                                        )}
                                    >
                                        <link.icon size={20} />
                                        <span className="font-medium">{link.label}</span>
                                    </Link>
                                );
                            })}

                            {/* Mobile Utility Links */}
                            <div className="border-t border-white/10 pt-4 mt-4 space-y-2">
                                <Link
                                    href="/support"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-all w-full"
                                >
                                    <PhoneCallIcon size={20} />
                                    <span className="font-medium">Support</span>
                                </Link>
                                <Link
                                    href="/track-order"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-md transition-all w-full"
                                >
                                    <TruckIcon size={20} />
                                    <span className="font-medium">Track Order</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

            </nav>
        </header>
    );
}
