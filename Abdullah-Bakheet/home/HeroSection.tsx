"use client"
import Link from 'next/link';
import { ArrowUpRightIcon, FacebookIcon, InstagramIcon, TwitterIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function HeroSection() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.hero : translations.en.hero;

    return (
        <section className="w-full bg-brand-gray text-black py-16 md:py-15 font-sans overflow-hidden">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8 flex flex-col lg:flex-row items-stretch gap-12 lg:gap-16">

                {/* Left Column: Typography & Content */}
                <div className="w-full lg:w-1/2 flex flex-col relative pt-0">

                    {/* Top Decorative accents */}
                    <div className="absolute -top-2 left-6 text-[#1a2b25] z-10 hidden md:block">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7l-2-4"/><path d="M11 8V3"/></svg>
                    </div>

                    {/* Main Title */}
                    <div className="font-heading flex flex-col relative z-20 mb-8 md:mb-12">
                        <h1 className={`text-[16vw] md:text-[110px] lg:text-[120px] xl:text-[190px] font-lg uppercase text-[#1a2b25] leading-[1] tracking-normal scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {t.firstName}
                        </h1>
                        <div className="flex items-center">
                            <h1 className={`text-[16vw] md:text-[110px] lg:text-[120px] xl:text-[190px] font-lg uppercase text-[#1a2b25] leading-[1] tracking-normal scale-y-110 transform origin-bottom relative ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                                {t.lastName}
                                {/* Right Decorative accent */}
                                <div className="absolute -top-6 right-0 text-[#1a2b25] hidden md:block">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 7l2-4"/><path d="M13 8V3"/></svg>
                                </div>
                            </h1>
                            {/* Starburst Graphic */}
                            <div className="ml-4 md:ml-8 mt-4 md:mt-8 text-[#1a2b25]">
                                <svg width="119" height="122" viewBox="0 0 119 122" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M61 0L62.9615 56.2662L104.133 17.8667L65.7349 59.0396L122 61L65.7338 62.9615L104.133 104.133L62.9615 65.7349L61 122L59.0396 65.7338L17.8667 104.133L56.2651 62.9615L0 61L56.2662 59.0396L17.8667 17.8667L59.0396 56.2651L61 0Z" fill="#1F312E"/>
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Left Content (Icons + Text) */}
                    <div className="flex mt-4 flex-1">

                        {/* Social Icons & Line Column */}
                        <div className="w-[60px] md:w-[80px] flex flex-col items-center flex-shrink-0 relative">
                            {/* Dark Circle with Scribble Arrow */}
                            <div className="w-12 h-12 md:w-16 md:h-16 bg-[#1a2b25] rounded-full flex items-center justify-center text-white mb-6 md:mb-8 relative z-20">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="md:w-8 md:h-8 rotate-45">
                                    <path d="M3 12c0-4 4-8 9-8s9 4 9 8-4 8-9 8c-3 0-6-1-7.5-3"/>
                                    <path d="M18 12l3 3-3 3"/>
                                </svg>
                            </div>

                            {/* Social Icons Container */}
                            <div className="flex flex-col gap-4 md:gap-5 items-center bg-brand-gray z-10 pb-4 pt-2">
                                <Link href="#" className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center hover:opacity-70 transition-opacity">
                                    <div className="bg-[#1a2b25] text-white p-1 md:p-1.5 rounded-sm">
                                        <TwitterIcon size={14}  />
                                    </div>
                                </Link>
                                <Link href="#" className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center hover:opacity-70 transition-opacity text-[#1a2b25]">
                                    <div className="border-[1.5px] border-[#1a2b25] p-1 rounded-md">
                                        <InstagramIcon size={14}  />
                                    </div>
                                </Link>
                                <Link href="#" className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center hover:opacity-70 transition-opacity text-[#1a2b25]">
                                    <div className="bg-[#1a2b25] text-white p-1.5 rounded-full flex items-center justify-center">
                                        <FacebookIcon size={15}  />
                                    </div>
                                </Link>
                            </div>

                            {/* Connecting Vertical Line */}
                            <div className="w-[2px] bg-black absolute top-16 md:top-50 -bottom-10 left-1/2 -translate-x-1/2 z-0"></div>
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 pl-4 md:pl-8 flex flex-col pt-2 pb-8">
                            <h2 className={`text-lg md:text-[22px] lg:text-[26px] font-bold text-black uppercase leading-snug tracking-wide mb-4 max-w-md ${isArabic ? 'text-right' : 'text-left'}`}>
                                {t.tagline}
                            </h2>
                            <p className={`text-[13px] md:text-[15px] text-gray-600 leading-relaxed mb-8 max-w-md font-medium ${isArabic ? 'text-right' : 'text-justify'}`}>
                                {t.description}
                            </p>

                            <Link
                                href="/about"
                                className="inline-flex items-center gap-2 border-b-2 border-black pb-1 text-sm md:text-base font-semibold hover:opacity-60 transition-opacity self-start tracking-wide group"
                            >
                                {t.knowMore} <ArrowUpRightIcon size={18} className="text-black group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </Link>
                        </div>

                    </div>
                </div>

                {/* Right Column: Image Collage */}
                <div className="w-full lg:w-1/2 grid grid-cols-2 gap-3 h-[400px] md:h-[500px] lg:h-[700px]">

                    {/* Top Left Image */}
                    <div className="col-span-1 h-full w-full bg-gray-100 overflow-hidden relative shadow-xs">
                        <img
                            src="/images/riyadh_hero_3.png"
                            alt={t.imgAlt1}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        />
                    </div>

                    {/* Top Right Image */}
                    <div className="col-span-1 h-full w-full bg-gray-100 overflow-hidden relative shadow-xs">
                        <img
                            src="/images/riyadh_hero_2.png"
                            alt={t.imgAlt2}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        />
                    </div>

                    {/* Bottom Full-width Image */}
                    <div className="col-span-2 h-full w-full bg-gray-100 overflow-hidden relative shadow-xs">
                        <img
                            src="/images/riyadh_hero_1.png"
                            alt={t.imgAlt3}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 object-center"
                        />
                    </div>

                </div>

            </div>
        </section>
    );
}