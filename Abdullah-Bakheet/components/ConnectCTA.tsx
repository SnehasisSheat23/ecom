"use client"
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRightIcon, InstagramIcon, YoutubeIcon, LinkedinIcon, TwitterIcon } from 'lucide-animated';
import { cn } from '@/lib/utils';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function ConnectCTA() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.connectCTA : translations.en.connectCTA;

    return (
        <section className="w-full bg-brand-gray text-black py-16 md:py-24 overflow-hidden flex justify-center font-sans">
            <div className="max-w-[1300px] w-full px-4 md:px-8 flex flex-col">

                {/* Top Row: ANY DOUBT + Text */}
                <div className="flex flex-col md:flex-row justify-start items-start w-full pl-[80px] md:pl-[80px] ">
                    <h2 className={`font-heading text-[15vw] md:text-[110px] lg:text-[190px] font-lg uppercase leading-[0.9] tracking-[0.04em] whitespace-nowrap scale-y-110 transform origin-bottom -translate-x-20 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                        {t.anyDoubt}
                    </h2>

                    <div className="hidden md:block max-w-xs mt-4 lg:mt-4 md:ml-8 self-start md:self-end">
                        <p className={`text-[13px] text-gray-700 leading-relaxed mb-4 ${isArabic ? 'text-right' : 'text-left'}`}>
                            {t.doubtDescription}
                        </p>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 border-b border-gray-400 pb-1 text-sm font-medium hover:opacity-70 transition-opacity"
                        >
                            {t.contactUs} <ArrowUpRightIcon size={16} className="text-gray-600" />
                        </Link>
                    </div>
                </div>

                {/* Middle & Bottom Rows */}
                <div className="flex w-full mt-10 md:mt-8">

                    {/* Left Sidebar: Vertical Line + Social Icons */}
                    <div className="w-[30px] md:w-[40px] lg:w-[80px] flex flex-col items-center flex-shrink-0 lg:translate-x-5 pr-2 md:pr-3 lg:pr-0">
                        {/* Vertical Line */}
                        <div className="w-[3px] h-[100px] md:h-[140px] bg-black mb-6"></div>

                        {/* Social Icons Stack */}
                        <div className="flex flex-col gap-4">
                            <Link href="#" className={cn('border border-gray-200 rounded-full bg-white text-black p-1.5 hover:opacity-80 transition-opacity')}>
                                <TwitterIcon size={20} />
                            </Link>
                            <Link href="#" className={cn('border border-gray-200 rounded-full bg-white text-black p-1.5 hover:opacity-80 transition-opacity')}>
                                <InstagramIcon size={20} />
                            </Link>
                            <Link href="#" className={cn('border border-gray-200 rounded-full bg-white text-black p-1.5 hover:opacity-80 transition-opacity')}>
                                <YoutubeIcon size={20} />
                            </Link>
                            <Link href="#" className={cn('border border-gray-200 rounded-full bg-white text-black p-1.5 hover:opacity-80 transition-opacity')}>
                                <LinkedinIcon size={20} />
                            </Link>
                        </div>
                    </div>
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0">

                        {/* LET'S CONNECT Text + Badge */}
                        <div className="relative inline-flex items-center self-start">
                            {/* Abdullah Pill Badge */}
                            <div className="absolute -top-3 left-4 md:-top-4 md:left-8 z-10">
                                <span className="inline-block bg-[#fbdc3c] text-black text-[9px] md:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider -rotate-[12deg] shadow-sm">
                                    {t.firstNameBadge}
                                </span>
                            </div>

                            <h2 className={`font-heading text-[15vw] md:text-[110px] lg:text-[190px] font-lg uppercase leading-[0.9] tracking-[0.04em] whitespace-nowrap scale-y-110 transform origin-bottom flex items-center lg:translate-x-10 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                                {t.letsConnect}
                                {/* Starburst Graphic */}
                                <span className="hidden md:inline-block ml-4 md:ml-8 mt-4 md:mt-0 text-black -translate-x-10">
                                    <svg width="119" height="122" viewBox="0 0 119 122" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M61 0L62.9615 56.2662L104.133 17.8667L65.7349 59.0396L122 61L65.7338 62.9615L104.133 104.133L62.9615 65.7349L61 122L59.0396 65.7338L17.8667 104.133L56.2651 62.9615L0 61L56.2662 59.0396L17.8667 17.8667L59.0396 56.2651L61 0Z" fill="#1F312E"/>
                                    </svg>
                                </span>
                            </h2>
                        </div>

                        {/* Bottom Row: Image + AND TALK */}
                        <div className="flex flex-row lg:flex-row items-end lg:items-end justify-between w-full mt-8 md:mt-1 gap-4 lg:gap-0">

                            {/* Meeting / Consultation Image */}
                            <div className="w-[150px] md:w-[350px] lg:w-[450px] h-[100px] md:h-[220px] relative bg-gray-100 overflow-hidden lg:translate-x-10 flex-shrink-0 shadow-sm">
                                <Image
                                    src="/images/lets_connect_talk.webp"
                                    alt={isArabic ? "لنتواصل ونتحدث" : "Let's Connect & Talk"}
                                    fill
                                    sizes="(max-width: 768px) 150px, (max-width: 1024px) 350px, 450px"
                                    className="object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>

                            {/* AND TALK Text + Badge */}
                            <div className="relative self-end lg:pr-8">
                                {/* Bakheet Pill Badge */}
                                <div className="absolute -top-6 right-2 md:-top-8 md:right-12 z-10">
                                    <span className="inline-block bg-[#fbdc3c] text-black text-[9px] md:text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider rotate-[12deg] shadow-sm">
                                        {t.lastNameBadge}
                                    </span>
                                </div>

                                <h2 className={`font-heading text-[15vw] md:text-[110px] lg:text-[190px] font-lg uppercase leading-[0.9] tracking-[0.04em] whitespace-nowrap scale-y-110 transform origin-bottom text-right ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                                    {t.andTalk}
                                </h2>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Paragraph + Contact Button - visible only on sm, below AND TALK */}
                <div className="md:hidden max-w-xl mt-3 pl-[80px] -translate-y-20">
                    <p className={`text-[15px] md:text-[13px] text-gray-700 leading-relaxed mb-4 ${isArabic ? 'text-right' : 'text-left'}`}>
                        {t.doubtDescription}
                    </p>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 border-b border-gray-400 pb-1 text-sm font-medium hover:opacity-70 transition-opacity"
                    >
                        {t.contactUs} <ArrowUpRightIcon size={16} className="text-gray-600" />
                    </Link>
                </div>

            </div>
        </section>
    );
}