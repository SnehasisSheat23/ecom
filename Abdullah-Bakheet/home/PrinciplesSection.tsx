"use client"
import Link from 'next/link';
import { ArrowUpRightIcon, ArrowRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function PrinciplesSection() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.principles : translations.en.principles;

    return (
        <section className="w-full bg-brand-gray py-16 md:py-10 font-sans overflow-hidden">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8 flex flex-col gap-6 md:gap-5">

                {/* Top Row: Main Title & Intro Text */}
                <div className="flex flex-col lg:flex-row justify-between items-start gap-8 lg:gap-12">

                    {/* Left Main Title */}
                    <div className="w-full lg:w-4/3">
                        <h2 className={`font-heading text-[12vw] md:text-[80px] lg:text-[100px] uppercase text-black leading-[1] tracking-wide scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {t.titleLine1}<br />
                            {t.titleLine2}
                        </h2>
                    </div>

                    {/* Right Intro Text & Button */}
                    <div className="w-full lg:w-1/3 flex flex-col items-start lg:pt-4">
                        <p className={`text-[14px] text-gray-500 leading-relaxed font-medium mb-6 ${isArabic ? 'text-right' : 'text-justify'}`}>
                            {t.description}
                        </p>
                        <Link
                            href="/about"
                            className="bg-[#1a2b25] text-white text-xs font-semibold px-6 py-2.5 rounded-full hover:bg-black transition-colors tracking-wide"
                        >
                            {t.knowMore}
                        </Link>
                    </div>
                </div>

                {/* Bottom Row: Images & Mission Text */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

                    {/* Left Column: Small Image & Dark Arrow Box */}
                    <div className="lg:col-span-2 flex flex-row lg:flex-col gap-6 items-center lg:items-start order-2 lg:order-1 ">
                        {/* Small Tower Image */}
                        <div className="w-[120px] h-[160px] bg-gray-200 overflow-hidden shadow-sm lg:-translate-y-15">
                            <img
                                src="/images/de981b3923467ebc746f398311365d9cdfa229db.png"
                                alt="Kingdom Centre Riyadh"
                                className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                            />
                        </div>

                        {/* Dark Arrow Box */}
                        <button className="w-[120px] h-[120px] bg-[#1a2b25] rounded-xl flex items-center justify-center group hover:bg-black transition-colors shadow-md lg:translate-y-15" aria-label="Explore mission">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                <ArrowRightIcon size={20} className="text-[#1a2b25] group-hover:translate-x-1 transition-transform"  />
                            </div>
                        </button>
                    </div>

                    {/* Center Column: Blob Image */}
                    <div className="lg:col-span-6 w-full h-[400px] md:h-[500px] relative order-1 lg:order-2 flex justify-center items-center">
                        <div className="w-none h-none bg-none overflow-none shadow-none relative group">
                            <img
                                src="/images/Riyadh Skyline Sunset.png"
                                alt="Riyadh Skyline Sunset"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                    </div>

                    {/* Right Column: Our Mission */}
                    <div className="lg:col-span-4 flex flex-col items-start order-3 lg:order-3">

                        {/* Yellow Mission Title */}
                        <div className="font-heading bg-[#fbdc3c] w-full px-6 py-4 mb-6">
                            <h3 className={`text-5xl md:text-[70px] mt-3 uppercase text-[#1a2b25] leading-none tracking-wider scale-y-110 transform origin-bottom text-center ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                                {t.ourMission}
                            </h3>
                        </div>

                        <p className={`text-[13px] md:text-[14px] text-gray-500 leading-relaxed font-medium mb-8 ${isArabic ? 'text-right' : 'text-justify'}`}>
                            {t.missionDescription}
                        </p>

                        <Link
                            href="/mission"
                            className="inline-flex items-center gap-2 border-b border-black pb-1 text-[15px] font-semibold hover:opacity-60 transition-opacity self-start tracking-wide group"
                        >
                            {t.knowMore}
                            <ArrowUpRightIcon size={18} className="text-black group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </Link>
                    </div>

                </div>
            </div>
        </section>
    );
}