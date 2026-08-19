"use client"
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function AboutStory() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');

    return (
        <section className="w-full bg-brand-gray py-16 md:py-10 font-sans overflow-hidden">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8 flex flex-col">

                {/* Top Header Block: BEST IMPORTER IN RIYADH, UAE */}
                <div className="flex flex-col gap-6 md:gap-8 mb-20 md:mb-32 w-full">

                    {/* Row 1: BEST IMPORTER + Image + Yellow Bar */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 md:gap-8 relative w-full lg:pr-12">

                        {/* 'FOOD' Badge */}
                        <div className="absolute -top-6 left-4 md:-top-8 md:left-8 z-10 hidden md:block">
                            <span className="inline-block bg-[#fbdc3c] text-black text-[10px] md:text-[12px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider -rotate-[15deg] shadow-sm">
                                {isArabic ? 'أغذية' : 'Food'}
                            </span>
                        </div>

                        <h2 className={`font-heading text-[14vw] md:text-[100px] lg:text-[150px] uppercase text-[#1a2b25] leading-[0.8] tracking-wider scale-y-110 transform origin-bottom whitespace-nowrap md:translate-x-16 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'أفضل مستورد' : 'Best Importer'}
                        </h2>

                        <div className="hidden md:block w-[100px] h-[100px] lg:w-[150px] lg:h-[150px] bg-white shadow-sm p-2 hover:scale-110 transition-transform duration-500 md:translate-x-18">
                            <img src="/images/e307efad5c4c43cfa7dbe3a5922100bb8a19ae1e.png" alt={isArabic ? 'شاي تويننجز الأخضر' : 'Twinings Green Tea'} className="w-full h-full object-contain" />
                        </div>

                        <div className="hidden lg:block w-[50px] h-[130px] bg-[#fbdc3c] flex-shrink-0 ml-auto -translate-x-20"></div>
                    </div>

                    {/* Row 2: Yellow Bar + Image + IN RIYADH, UAE */}
                    <div className="flex flex-wrap items-center justify-center lg:justify-end gap-4 md:gap-8 relative w-full lg:pl-12">

                        <div className="hidden lg:block w-[50px] h-[130px] bg-[#fbdc3c] flex-shrink-0 mr-auto translate-x-5"></div>

                        <div className="hidden md:block w-[120px] h-[120px] lg:w-[150px] lg:h-[150px] bg-white shadow-sm p-2 hover:scale-110 transition-transform duration-500 md:-translate-x-33">
                            <img src="/images/fb6086db76f48ad87a9eaa300b5e268336554933.png" alt={isArabic ? 'كوكتيل فواكه' : 'Fruit Cocktail'} className="w-full h-full object-contain" />
                        </div>

                        <h2 className={`font-heading text-[14vw] md:text-[100px] lg:text-[150px] uppercase text-[#1a2b25] leading-[0.8] tracking-wider scale-y-110 transform origin-bottom whitespace-nowrap relative md:-translate-x-30 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'في الرياض، المملكة' : 'In Riyadh, UAE'}

                            {/* 'TRADING' Badge */}
                            <div className="absolute -top-2 -right-4 md:-top-4 md:-right-8 z-10 hidden md:block">
                                <span className="inline-block bg-[#fbdc3c] text-black text-[10px] md:text-[12px] font-black px-4 py-1.5 rounded-full uppercase tracking-wider rotate-[15deg] shadow-sm">
                                    {isArabic ? 'تجارة' : 'Trading'}
                                </span>
                            </div>
                        </h2>

                    </div>
                </div>

                {/* Bottom Content Block: OUR REAL STORY */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">

                    {/* Left Column: Title and Icon */}
                    <div className="font-heading lg:col-span-5 flex flex-col items-center lg:items-start pt-2 lg:translate-x-15 lg:translate-y-5">
                        <h3 className={`text-6xl md:text-[75px] lg:text-[110px] uppercase text-[#1a2b25] leading-[0.85] tracking-wider scale-y-110 transform origin-bottom mb-2 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'قصتنا' : 'Our Real'}
                        </h3>

                        <div className="bg-[#fbdc3c] px-6 py-2 md:px-8 md:py-3 -rotate-[6deg] mb-12 shadow-sm">
                            <h3 className={`text-6xl pt-4 md:text-[75px] lg:text-[110px] uppercase text-[#1a2b25] leading-[0.85] tracking-wider scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                                {isArabic ? 'الحقيقية' : 'Story'}
                            </h3>
                        </div>

                        {/* Dark Circle with Hand-drawn Arrow */}
                        <div className="w-20 h-20 md:w-24 md:h-24 bg-[#1a2b25] rounded-full flex items-center justify-center text-white lg:ml-12 shadow-md hover:bg-black transition-colors">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="rotate-90 md:rotate-0">
                                <path d="M10 5C10 5 4 8 4 14C4 20 12 21 16 16C18.5 12.5 15 8 11 11C8 13 9 18 14 20C18 21.5 22 18 22 18"/>
                                <path d="M18 21.5L22 18L19 14"/>
                            </svg>
                        </div>
                    </div>

                    {/* Right Column: Text and Button */}
                    <div className="lg:col-span-7 flex flex-col">
                        <p className={`text-[14px] md:text-[20px] text-gray-600 leading-relaxed font-medium mb-10 ${isArabic ? 'text-right' : 'text-justify'}`}>
                            {isArabic ? 'مع أكثر من عقدين من الخبرة في هذا المجال، قمنا بتطوير علاقات طويلة الأمد مع كبرى العلامات التجارية العالمية والمصنعين، مما يضمن حصول عملائنا على أفضل المنتجات فقط. إن التزامنا بالجودة والموثوقية ورضا العملاء قد جعلنا شريكًا موثوقًا به في قطاع خدمات الأغذية والتجزئة. أن نكون مستورد وموزع الأغذية الرائد والأكثر ثقة في المملكة العربية السعودية.' : 'With over two decades of industry expertise, we have cultivated long-term relationships with top international brands and manufacturers, ensuring that our clients receive only the finest products. Our commitment to quality, reliability, and customer satisfaction has positioned us as a trusted partner in the foodservice and retail industry. To be the leading and most trusted food importer and distributor in Saudi Arabia, recognized for our commitment to quality, innovation, and customer satisfaction. We strive to expand our reach, foster strong partnerships, and set new standards in the food distribution industry while ensuring sustainability and excellence in every product we deliver.'}
                        </p>

                        <Link
                            href="/products"
                            className="bg-[#1a2b25] text-white px-8 py-4 flex items-center justify-center w-fit hover:bg-black transition-colors group"
                        >
                            <span className="text-sm md:text-base font-semibold mr-3 uppercase tracking-wide">
                                {isArabic ? 'عرض المنتجات' : 'View Products'}
                            </span>
                            <ArrowUpRightIcon
                                size={20}
                                className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                            />
                        </Link>
                    </div>

                </div>

            </div>
        </section>
    );
}