"use client"
import Link from 'next/link';
import { ArrowUpRightIcon, ArrowLeftIcon, ArrowRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function WhyChooseUs() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.whyChooseUs : translations.en.whyChooseUs;

    const features = [
        {
            title: t.feature1Title,
            desc: t.feature1Desc,
        },
        {
            title: t.feature2Title,
            desc: t.feature2Desc,
        },
        {
            title: t.feature3Title,
            desc: t.feature3Desc,
        },
    ];

    return (
        <section className="w-full bg-brand-gray py-16 md:py-24 font-sans">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">

                {/* Left Column: Title, Text, Stats, and Button */}
                <div className="lg:col-span-4 flex flex-col pt-0">

                    {/* Yellow Title Box */}
                    <div className="font-heading bg-[#fbdc3c] self-start px-6 py-4 md:px-8 md:py-6 mb-4 inline-block">
                        <h2 className={`text-6xl md:text-[90px] uppercase text-[#1a2b25] leading-[1] tracking-normal transform scale-y-110 origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {t.titleLine1}<br />{t.titleLine2}
                        </h2>
                    </div>

                    <p className={`text-[14px] md:text-[15px] text-gray-500 leading-relaxed font-medium mb-3 ${isArabic ? 'text-right' : 'text-justify md:text-left'}`}>
                        {isArabic ? (
                            <>
                                إن التزامنا بالجودة والموثوقية ورضا العملاء قد جعلنا شريكًا موثوقًا به في قطاع خدمات الأغذية والتجزئة. في شركة <strong className="text-black font-semibold">{t.companyName}</strong> للتجارة، نفخر ببناء علاقات قوية وطويلة الأمد مع كبرى الشركات في المملكة العربية السعودية.
                            </>
                        ) : (
                            <>
                                Our commitment to quality, reliability, customer satisfaction has positioned us as a trusted partner in the foodservice and retail industry. At <strong className="text-black font-semibold">{t.companyName}</strong> Trading Co., we take pride in building strong, long-term relationships with leading businesses across Saudi Arabia.
                            </>
                        )}
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-6 mb-8">
                        <div className="flex flex-col">
                            <span className="font-heading text-5xl md:text-6xl text-black tracking-wide mb-2 transform scale-y-110 origin-bottom">{t.yearsExpVal}</span>
                            <span className="text-[15px] font-bold text-[#1a2b25] leading-snug">{t.yearsExpLabelLine1}<br/>{t.yearsExpLabelLine2}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-heading text-5xl md:text-6xl text-black tracking-wide mb-2 transform scale-y-110 origin-bottom">{t.productsVal}</span>
                            <span className="text-[15px] font-bold text-[#1a2b25] leading-snug">{t.productsLabelLine1}<br/>{t.productsLabelLine2}</span>
                        </div>
                    </div>

                    <Link
                        href="/about"
                        className="bg-[#1a2b25] text-white px-8 py-4 flex items-center justify-center w-fit hover:bg-black transition-colors group mt-auto"
                    >
                        <span className="text-sm md:text-base font-semibold mr-3 uppercase tracking-wide">{t.knowMore}</span>
                        <ArrowUpRightIcon
                            size={20}
                            className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                        />
                    </Link>

                </div>

                {/* Center Column: Featured Image */}
                <div className="lg:col-span-4 relative h-[500px] lg:h-[600px] w-full bg-gray-100 group overflow-hidden">
                    <img
                        src="/images/9196aa974a546890810c6016161c0beac023dd87.png"
                        alt="Saudi Arabia Landmark"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />

                    {/* "Featured" Pill Badge */}
                    <div className="absolute top-6 left-6 bg-white text-black text-xs font-bold px-4 py-1.5 rounded-full z-10 shadow-sm">
                        {t.featured}
                    </div>

                    {/* Navigation Arrows */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 z-10 text-white/80">
                        <button className="hover:text-white transition-colors p-2" aria-label="Previous image">
                            <ArrowLeftIcon size={24} />
                        </button>
                        <button className="hover:text-white transition-colors p-2" aria-label="Next image">
                            <ArrowRightIcon size={24} />
                        </button>
                    </div>

                    {/* Subtle gradient overlay at bottom for arrow visibility */}
                    <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                </div>

                {/* Right Column: Feature List */}
                <div className="lg:col-span-4 lg:h-[600px] flex flex-col gap-10 lg:gap-12 justify-top pt-4 lg:py-0 lg:pl-6">
                    {features.map((feature, index) => (
                        <div key={index} className="flex flex-col">
                            <h3 className={`text-[19px] md:text-[21px] font-bold text-black leading-snug mb-3 pr-4 ${isArabic ? 'text-right' : 'text-left'}`}>
                                {feature.title}
                            </h3>
                            <p className={`text-[14px] md:text-[15px] text-gray-400 leading-relaxed font-medium ${isArabic ? 'text-right' : 'text-justify md:text-left'}`}>
                                {feature.desc}
                            </p>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}