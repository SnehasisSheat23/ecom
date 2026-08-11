"use client";

import Link from 'next/link';
import Image from 'next/image';
import {
    FacebookIcon,
    InstagramIcon,
    LinkedinIcon,
    MailboxIcon,
    TwitterIcon,
} from 'lucide-animated';
import { cn } from '@/lib/utils';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function Footer() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.footer : translations.en.footer;
    const tCat = isArabic ? translations.ar.categories.list : translations.en.categories.list;
    const tCards = isArabic ? translations.ar.categories.cards : translations.en.categories.cards;

    return (
        <footer className={cn('w-full bg-black text-white pt-16 font-sans relative overflow-hidden')}>
            <div className="max-w-[1400px] mx-auto px-4 md:px-8 lg:px-10 ">

                {/* Top Grid Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-20 pb-8 relative z-10">

                    {/* Column 1: Brand & Newsletter (Span 5 cols on large screens) */}
                    <div className={`lg:col-span-5 flex flex-col gap-6 ${isArabic ? 'text-right' : 'text-justify'}`}>
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white rounded-full p-1.5 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                <Image
                                    src="/images/footer_logo.png"
                                    alt="Abdullah Bakheet Logo"
                                    width={48}
                                    height={48}
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <h3 className="font-bold text-lg tracking-widest uppercase">
                                {isArabic ? translations.ar.hero.firstName + ' ' + translations.ar.hero.lastName : 'Abdullah Bakheet'}
                            </h3>
                        </div>

                        <p className="text-[15px] text-gray-400 leading-relaxed pr-4">
                            {t.vision1}
                        </p>

                        <p className="text-[15px] text-gray-400 leading-relaxed pr-4">
                            {t.vision2}
                        </p>

                        <div className="mt-2">
                            <span className="text-sm font-semibold mb-3 block">{t.newsletterTitle}</span>
                            <div className={cn('flex bg-white rounded-full p-1.5 w-full max-w-sm items-center')}>
                                <div className="pl-3 pr-2 text-gray-500">
                                    <MailboxIcon size={18} />
                                </div>
                                <input
                                    type="email"
                                    placeholder={t.emailPlaceholder}
                                    className="bg-transparent text-gray-900 text-sm outline-none flex-1 placeholder:text-gray-500"
                                />
                                <button className="bg-[#1b2a26] text-white text-sm px-6 py-2 rounded-full hover:bg-gray-800 transition-colors font-medium">
                                    {t.submit}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Pages (Span 2 cols) */}
                    <div className={`lg:col-span-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                        <h4 className="font-medium text-lg mb-6">{t.pagesTitle}</h4>
                        <ul className="flex flex-col gap-4 text-[15px] text-gray-400">
                            <li><Link href="/" className="hover:text-white transition-colors">{t.home}</Link></li>
                            <li><Link href="/about" className="hover:text-white transition-colors">{t.about}</Link></li>
                            <li><Link href="/products" className="hover:text-white transition-colors">{t.products}</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">{t.contact}</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Categories (Span 2 cols) */}
                    <div className={`lg:col-span-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                        <h4 className="font-medium text-lg mb-6">{t.categoriesTitle}</h4>
                        <ul className="grid grid-cols-1 sm:grid-cols-1 gap-y-4 gap-x-4 text-[15px] text-gray-400">
                            <li><Link href="/category/ketchup" className="hover:text-white transition-colors">{tCat.ketchup}</Link></li>
                            <li><Link href="/category/french-fries" className="hover:text-white transition-colors">{tCards.frenchFriesTitle}</Link></li>
                            <li><Link href="/category/vinegar" className="hover:text-white transition-colors">{tCat.vinegar}</Link></li>
                            <li><Link href="/category/frozen-items" className="hover:text-white transition-colors">{tCards.frozenItemsTitle}</Link></li>
                            <li><Link href="/category/pickles" className="hover:text-white transition-colors">{tCat.pickles}</Link></li>
                            <li><Link href="/category/seasonings" className="hover:text-white transition-colors">{tCards.seasoningsTitle}</Link></li>
                            <li><Link href="/category/sauces-dressings" className="hover:text-white transition-colors">{tCat.sauces}</Link></li>
                            <li><Link href="/category/oils" className="hover:text-white transition-colors">{tCat.oils}</Link></li>
                        </ul>
                    </div>

                    {/* Column 4: Our Contacts (Span 3 cols) */}
                    <div className={`lg:col-span-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                        <h4 className="font-medium text-lg mb-6">{t.contactsTitle}</h4>
                        <ul className="flex flex-col gap-4 text-[15px] text-gray-400 mb-6">
                            <li>
                                <span className="block text-white mb-1">{t.phoneLabel}</span>
                                +91 8910647915
                            </li>
                            <li>
                                <span className="block text-white mb-1">{t.whatsappLabel}</span>
                                +91 8910647915
                            </li>
                            <li>
                                <span className="block text-white mb-1">{t.emailLabel}</span>
                                sandipan@gmail.com
                            </li>
                        </ul>

                        {/* Social Icons */}
                        <div className={`flex gap-4 mb-6 ${isArabic ? 'justify-end' : 'justify-start'}`}>
                            <Link href="#" className={cn('bg-white text-black p-1.5 rounded-sm hover:opacity-80 transition-opacity')}>
                                <TwitterIcon size={16} />
                            </Link>
                            <Link href="#" className={cn('bg-white text-black p-1.5 rounded-sm hover:opacity-80 transition-opacity')}>
                                <FacebookIcon size={16} />
                            </Link>
                            <Link href="#" className={cn('bg-white text-black p-1.5 rounded-sm hover:opacity-80 transition-opacity')}>
                                <InstagramIcon size={16} />
                            </Link>
                            <Link href="#" className={cn('bg-white text-black p-1.5 rounded-sm hover:opacity-80 transition-opacity')}>
                                <LinkedinIcon size={16} />
                            </Link>
                        </div>

                        {/* Legal Links */}
                        <ul className="flex flex-col gap-3 text-[15px] text-gray-400">
                            <li><Link href="/privacy-policy" className="hover:text-white transition-colors">{t.privacyPolicy}</Link></li>
                            <li><Link href="/terms-and-conditions" className="hover:text-white transition-colors">{t.termsConditions}</Link></li>
                            <li><Link href="/cookie-policy" className="hover:text-white transition-colors">{t.cookiePolicy}</Link></li>
                        </ul>
                    </div>

                </div>

                {/* Massive Brand Graphic Section */}
                <div className="relative w-full flex justify-center items-center mt-12 mb-8">

                    {/* Tilted Badges */}
                    <div className="absolute left-[10%] md:left-[15%] top-4 z-20 rotate-[-10deg] bg-brand-yellow text-black font-bold text-xs md:text-sm px-4 py-1.5 rounded-full uppercase tracking-wider">
                        {t.badgeTrading}
                    </div>
                    <div className="absolute right-[5%] md:right-[15%] top-2 z-20 rotate-10 bg-brand-yellow text-black font-bold text-xs md:text-sm px-4 py-1.5 rounded-full uppercase tracking-wider">
                        {t.badgeCompany}
                    </div>

                    {/* Central Product Image */}
                    <div className="absolute top-1/2 left-1/3 translate-x-1/2 translate-y-[-220%] z-30 w-32 h-32 md:w-40 md:h-40 bg-white rounded-full border-4 border-black flex items-center justify-center overflow-hidden">
                        <Image
                            src="https://www.dropbox.com/scl/fi/es43uex45can2jctwzil2/a86ce4a691c715f9e05179a25eb352f4328feeab.jpg?rlkey=7ypjvozxl400cmr5rvyh5doin&st=qhuq411q&raw=1"
                            alt="Nestol Mustard"
                            className="h-[80%] w-auto object-contain"
                            width={160}
                            height={160}
                            unoptimized
                        />
                    </div>

                    {/* Gradient Text */}
                    <h1 className={`font-heading text-[16vw] font-lg uppercase tracking-normal leading-none select-none text-transparent bg-clip-text bg-linear-to-b from-white via-white/25 to-black w-full text-center scale-y-100 transform origin-bottom pb-4 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                        {isArabic ? translations.ar.hero.firstName + ' ' + translations.ar.hero.lastName : 'Abdullah Bakheet'}
                    </h1>
                </div>

                {/* Bottom Copyright Bar */}
                <div className="w-full border-t border-gray-800 py-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-gray-400 tracking-wide z-10 relative">
                    <p>{t.copyright}</p>
                    <p>
                        {t.builtWith} <span className="text-white font-medium">{t.by}</span> <span className="text-red-500 text-sm">❤</span>
                    </p>
                </div>

            </div>
        </footer>
    );
}

