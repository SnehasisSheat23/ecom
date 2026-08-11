"use client"
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';

export default function ProductsHero() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');

    return (
        <section className="w-full bg-brand-gray py-12 md:py-16 font-sans">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                    {/* Left Column (Images) */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        {/* Top Image: Frozen Beef */}
                        <div className="w-full h-[300px] md:h-[400px] bg-gray-100 overflow-hidden relative">
                            <img
                                src="/images\a2693c72ac8332cb5a5d4319c8c8b887edb71e21.png"
                                alt={isArabic ? 'لحم بقر مجمد' : 'Frozen Beef Topside'}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                            />
                        </div>

                        {/* Bottom Image: Creamy Sauce */}
                        <div className="w-full h-[250px] md:h-[300px] bg-gray-100 overflow-hidden relative">
                            <img
                                src="/images/b25eb083f82f05ac9fb32dc643d429a29362152d.png"
                                alt={isArabic ? 'صلصة كريمة' : 'Creamy Sauce'}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                    </div>

                    {/* Right Column (Image, Banner, Text) */}
                    <div className="lg:col-span-7 flex flex-col gap-6">

                        {/* Top Image: Mayo Packets */}
                        <div className="w-full h-[250px] md:h-[350px] bg-gray-100 overflow-hidden relative">
                            <img
                                src="/images/53140adbcf2e27d7332f768e35de12328b2adba3.jpg"
                                alt={isArabic ? 'أظرف مايونيز' : "Duke's Mayonnaise Packets"}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                            />
                        </div>

                        {/* Middle Banner: BUY ONE */}
                        <div className="w-full flex h-[100px] md:h-[170px] items-stretch gap-4 md:gap-6 overflow-hidden">
                            {/* Yellow Box */}
                            <div className="flex-1 bg-[#fbdc3c] flex items-center px-6 md:p-10 ">
                                <h2 className={`font-heading text-6xl md:text-[143px] pt-6 uppercase text-[#1a2b25] leading-none tracking-wider transform scale-y-110 origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                                    {isArabic ? 'اشترِ الآن' : 'Buy One'}
                                </h2>
                            </div>

                            {/* Starburst Graphic Container */}
                            <div className="w-[100px] md:w-[130px] flex-shrink-0 flex items-center justify-center border-y border-transparent">
                                <svg width="119" height="122" viewBox="0 0 119 122" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M61 0L62.9615 56.2662L104.133 17.8667L65.7349 59.0396L122 61L65.7338 62.9615L104.133 104.133L62.9615 65.7349L61 122L59.0396 65.7338L17.8667 104.133L56.2651 62.9615L0 61L56.2662 59.0396L17.8667 17.8667L59.0396 56.2651L61 0Z" fill="#1F312E"/>
                                </svg>
                            </div>

                            {/* Right Yellow Block */}
                            <div className="w-[30px] md:w-[50px] flex-shrink-0 bg-[#fbdc3c]"></div>
                        </div>

                        {/* Bottom Text Area */}
                        <div className="w-full pt-4 md:pt-0 lg:pr-12">
                            <p className={`text-[14px] md:text-[15px] text-gray-600 leading-relaxed font-medium mb-8 ${isArabic ? 'text-right' : 'text-justify'}`}>
                                {isArabic ? (
                                    <>حلول توريد مخصصة لجميع الأحجام. سواء كنت تبحث عن مكونات متخصصة أو تود التوسع في عمليات الشراء بالجملة، تقدم شركة <strong className="text-black font-semibold">عبدالله بخيت للتجارة</strong> حلولاً مصممة لخدمة أعمالك. نحن نتولى الاستيراد والتعبئة واللوجستيات لضمان حصولك على الكميات المطلوبة بأعلى دقة دون عناء.</>
                                ) : (
                                    <>Tailored supply solutions for every scale. Whether you&#39;re sourcing specialized ingredients or scaling up with bulk procurement, <strong className="text-black font-semibold">Abdullah Bakheet Trading Co.</strong> delivers custom solutions built around your business. We handle the sourcing, custom packaging, and logistics—so you get exact quantities, specialized specs, and zero hassle.</>
                                )}
                            </p>

                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 border-b-2 border-black pb-1 text-base md:text-lg font-semibold hover:opacity-60 transition-opacity self-start tracking-wide group"
                            >
                                {isArabic ? 'منتجاتنا' : 'Our Products'}
                                <ArrowUpRightIcon size={22} className="text-black group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </Link>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
}