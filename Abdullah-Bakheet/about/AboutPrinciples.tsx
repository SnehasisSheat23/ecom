"use client"
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function AboutPrinciples() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.principles : translations.en.principles;

    return (
        <section className="w-full bg-brand-gray py-16 md:py-24 font-sans overflow-hidden">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8 flex flex-col">

                {/* Top Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10 mb-16 lg:mb-20">

                    {/* Left: Titles */}
                    <div className="font-heading w-full lg:w-[60%] flex flex-col">
                        <h2 className={`text-[13vw] md:text-[85px] lg:text-[91.5px] uppercase text-black leading-[0.85] tracking-wider scale-y-110 transform origin-bottom flex flex-wrap gap-x-4 items-center ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'مبادئنا' : 'OUR'} <span className="bg-[#fbdc3c] px-4 pt-1">{isArabic ? 'التي تجعلنا' : 'PRINCIPLES'}</span>
                        </h2>
                        <h2 className={`text-[13vw] md:text-[85px] lg:text-[91.5px] uppercase text-black leading-[0.85] tracking-wider scale-y-110 transform origin-bottom mt-3 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'متميزين دائمًا' : 'THAT MAKE US DIFFERENT'}
                        </h2>
                    </div>

                    {/* Right: Paragraph & CTA */}
                    <div className="w-full lg:w-[35%] flex flex-col lg:pb-4">
                        <p className={`text-[13px] md:text-[14px] text-gray-700 leading-relaxed font-medium mb-6 ${isArabic ? 'text-right' : 'text-justify'}`}>
                            {isArabic ? 'الشراكات القوية هي جوهر كل ما نقوم به. لقد كسبنا ثقة دائمة من أرقى المطاعم والفنادق وشركات الإعاشة والموزعين بالمملكة العربية السعودية من خلال توريد منتجات فاخرة وخدمة مخصصة وموثوقة.' : "Strong partnerships are at the heart of everything we do. We've earned the lasting trust of Saudi Arabia's finest restaurants, hotels, caterers, and distributors by providing premium food supplies paired with dedicated, reliable service."}
                        </p>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 border-b border-black pb-1 text-[15px] font-semibold hover:opacity-60 transition-opacity self-start tracking-wide group"
                        >
                            {isArabic ? 'تواصل معنا' : 'Contact Us'}
                            <ArrowUpRightIcon size={18} className="text-black group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </Link>
                    </div>

                </div>

                {/* Bottom Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">

                    {/* Left Column: Vertical Banner & Small Image */}
                    <div className="lg:col-span-2 flex flex-col gap-6">

                        {/* Vertical Yellow Banner */}
                        <div className="bg-[#fbdc3c] w-[70%] h-[120px] lg:h-[450px] flex items-center justify-center overflow-hidden lg:translate-x-7">
                            <h3 className={`font-heading text-6xl md:text-[100px] uppercase text-black tracking-wider scale-y-110 transform lg:-rotate-90 whitespace-nowrap origin-center ${isArabic ? 'font-sans font-black tracking-tight scale-y-100 lg:rotate-0' : ''}`}>
                                {isArabic ? 'مهمتنا' : 'OUR MISSION'}
                            </h3>
                        </div>

                        {/* Scales Image */}
                        <div className="w-full h-[250px] lg:flex-grow bg-gray-100 overflow-hidden">
                            <img
                                src="/images/948f6236332983ad25e7ff28ce62bed5ac361bcf.jpg"
                                alt="Scales of Justice"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                    </div>

                    {/* Middle Column: Tall Floating Island Image */}
                    <div className="lg:col-span-4 h-[400px] lg:h-auto bg-gray-100 overflow-hidden">
                        <img
                            src="/images/0517b4886cef67fc8979157e419d49271f57a298.jpg"
                            alt="Floating Island Silhouette"
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                        />
                    </div>

                    {/* Right Column: Text Block & Small Image Grid */}
                    <div className="lg:col-span-6 flex flex-col gap-6">

                        {/* Text Block */}
                        <div className="bg-[#fcfcfc] p-6 lg:p-10 border border-gray-50 flex-grow shadow-[0_2px_20px_-10px_rgba(0,0,0,0.06)] flex flex-col justify-center">
                            <p className={`text-[13px] md:text-[20px] text-gray-700 leading-relaxed font-medium ${isArabic ? 'text-right' : 'text-justify'}`}>
                                {isArabic ? (
                                    <>في شركة <strong className="text-black font-semibold">عبدالله بخيت للتجارة</strong>، تكمن مهمتنا في تمكين والارتقاء بقطاعات الأغذية والضيافة والتجزئة في المملكة العربية السعودية من خلال توفير الوصول السلس إلى أجود المنتجات العالمية. مبنية على أساس أكثر من عقدين من الخبرة الصناعية.</>
                                ) : (
                                    <>At <strong className="text-black font-semibold">Abdullah Bakheet Trading Co.</strong>, our mission is to empower and elevate Saudi Arabia&#39;s food service, hospitality, and retail sectors by providing seamless access to the world&#39;s finest culinary products. Built on a foundation of over two decades of industry expertise, we bridge the gap between premier global food producers and local commercial kitchens, hotels, caterers, and retailers. We are committed to maintaining uncompromising quality control, driving efficiency through an advanced Kingdom-wide cold chain logistics network, and delivering personalized, solution-driven customer support.</>
                                )}
                            </p>
                        </div>

                        {/* 3 Small Images Grid */}
                        <div className="grid grid-cols-3 gap-3 md:gap-5 h-[150px] md:h-[220px]">
                            <div className="bg-gray-100 overflow-hidden">
                                <img src="/images/5ddbedaa1b096f1ed11999fed1b33a77c55c981f.jpg" alt="Tech Abstract" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                            </div>
                            <div className="bg-gray-100 overflow-hidden">
                                <img src="/images/ce44d23a6808866cb7252fd4ec93e027d262ed96.jpg" alt="Team Hands Stacked" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                            </div>
                            <div className="bg-gray-100 overflow-hidden">
                                <img src="/images/131977cd0b2d6ff8b75cd2dae706a110c11b183b.jpg" alt="Team Hands Circle" className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                            </div>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
}