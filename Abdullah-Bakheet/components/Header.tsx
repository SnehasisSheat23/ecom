"use client";

import { useState, useEffect } from 'react';
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

    const [isScrolled, setIsScrolled] = useState(false);
    const isHome = pathname === '/';

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 30);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header
            className={cn(
                'w-full flex flex-col font-sans z-50 transition-all duration-300',
                isHome
                    ? 'fixed top-0 left-0'
                    : 'sticky top-0 bg-brand-dark shadow-md',
                isHome && isScrolled
                    ? 'bg-brand-dark/95 backdrop-blur-md border-b border-white/10 shadow-lg'
                    : isHome
                    ? 'bg-transparent'
                    : ''
            )}
        >
            {/* Main Navigation Bar */}
            <nav className={cn('w-full text-white', !isHome && 'bg-brand-dark')}>
                <div className="max-w-7xl mx-auto px-4 lg:px-8 flex justify-between items-center h-14 sm:h-16">
                    {/* Left: Navigation Links */}
                    <div className="flex items-center gap-8 h-full">
                        {/* Navigation Links - Desktop Only */}
                        <div className="hidden lg:flex items-center gap-1 h-full">
                            {navLinks.map((link) => {
                                const active = isActive(link.href);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className={cn(
                                            'flex items-center gap-2 px-4 h-full transition-all border-b-2 font-medium',
                                            active
                                                ? 'text-white border-white'
                                                : 'text-gray-300 border-transparent hover:text-white hover:border-white/50'
                                        )}
                                    >
                                        <link.icon size={18} />
                                        <span>{link.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Side: Account & Cart Icons + Mobile Menu Button */}
                    <div className="flex items-center gap-5 ml-auto lg:ml-0">
                        {/* Quick Language Toggle */}
                        <button
                            onClick={() => setLanguage(isArabic ? 'English' : 'Arabic (العربية)')}
                            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border border-white/20 hover:bg-white/10 transition-colors text-white cursor-pointer"
                            title="Switch Language"
                        >
                            <EarthIcon size={14} className="text-gray-300" />
                            <span>{isArabic ? 'EN' : 'عربي'}</span>
                        </button>

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
