"use client"
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function AboutHero() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.hero : translations.en.hero;

    return (
        <section className="w-full bg-brand-gray py-12 md:py-15 font-sans">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8">

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

                    {/* Left Column */}
                    <div className="lg:col-span-5 flex flex-col gap-6">

                        {/* Promotional Image */}
                        <div className="w-full h-[450px] md:h-[550px] bg-gray-100 overflow-hidden relative shadow-sm">
                            <img
                                src="https://www.dropbox.com/scl/fi/f8hzjpr9gykd1vfcntxdg/9bffb676f3fc5952905460da449301cf3bbd3f8e.png?rlkey=8m79w5v50wbqs3feutwg8zd4u&st=arezi8rg&raw=1"
                                alt="Global Taste You Can Trust"
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                            />
                        </div>

                        {/* Stats Box */}
                        <div className="w-full bg-white p-8 md:p-10 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-50 flex flex-col relative overflow-hidden group">
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                                <span className="text-[150px] font-black leading-none">AB</span>
                            </div>

                            <div className="flex justify-between items-start mb-4 relative z-10">
                                <h3 className="font-heading text-5xl md:text-[65px] uppercase text-black leading-none tracking-wider transform scale-y-110 origin-bottom">
                                    300+
                                </h3>
                                <Link href="/products" className="w-12 h-12 bg-black rounded-full flex items-center justify-center hover:bg-[#1a2b25] transition-colors shrink-0">
                                    <ArrowUpRightIcon size={24} className="text-white"  />
                                </Link>
                            </div>

                            <h4 className={`font-heading text-xl md:text-4xl uppercase text-black tracking-wider mb-4 relative z-10 transform scale-y-110 origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100 text-right' : ''}`}>
                                {isArabic ? 'منتج متوفر' : 'Products Available'}
                            </h4>

                            <p className={`text-[13px] text-gray-500 leading-relaxed font-medium relative z-10 ${isArabic ? 'text-right' : 'text-justify'}`}>
                                {isArabic ? 'نبني شراكات مستدامة عبر تقديم أسعار تنافسية ولوجستيات سلسة وحلول مخصصة لدعم نمو عملائنا.' : "We build lasting partnerships by offering competitive pricing, seamless logistics, and tailored solutions to support our clients' growth"}
                            </p>
                        </div>

                    </div>

                    {/* Right Column */}
                    <div className="lg:col-span-7 flex flex-col gap-6">

                        {/* Top Split Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Building Image */}
                            <div className="w-full h-[300px] md:h-[350px] bg-gray-100 overflow-hidden relative shadow-sm">
                                <img
                                    src="/images/de981b3923467ebc746f398311365d9cdfa229db.png"
                                    alt="Riyadh Centre"
                                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                                />
                            </div>

                            {/* Dark Green Brand Box */}
                            <div className="w-full h-[300px] md:h-[350px] bg-[#22322a] p-8 md:p-10 flex flex-col relative overflow-hidden shadow-sm">
                                <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-sm pointer-events-none"></div>
                                <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-sm pointer-events-none"></div>

                                <h3 className={`font-heading text-3xl md:text-4xl uppercase text-white leading-none tracking-wider mb-6 relative z-10 transform scale-y-110 origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100 text-right' : ''}`}>
                                    {isArabic ? 'شركة عبدالله بخيت للتجارة' : <>Abdullah Bakheet<br/>Trading Company</>}
                                </h3>
                                <p className={`text-[13px] text-gray-300 leading-relaxed font-medium relative z-10 mt-auto pr-2 ${isArabic ? 'text-right' : 'text-justify'}`}>
                                    {isArabic ? 'تُبنى الثقة على الجودة والاستمرارية. في شركة عبدالله بخيت للتجارة، نمكّن الشركات الرائدة في قطاعات الضيافة والتجزئة والجملة بالمملكة من خلال توريد منتجات غذائية فاخرة مدعومة بموثوقية وتميز في الخدمة.' : "Trust is built on quality and consistency. At Abdullah Bakheet Trading Co., we empower Saudi Arabia's premier hospitality, retail, and wholesale businesses by delivering high-caliber food products backed by unmatched reliability and service excellence."}
                                </p>
                            </div>

                        </div>

                        {/* Middle Banner: ABOUT US */}
                        <div className="w-full flex h-[100px] md:h-[170px] items-stretch gap-4 md:gap-6 overflow-hidden">
                            {/* Yellow BUY ONE Box */}
                            <div className="flex-1 bg-[#fbdc3c] flex items-center px-6 md:p-10 ">
                                <h2 className={`font-heading text-6xl md:text-[129px] pt-6 uppercase text-[#1a2b25] leading-none tracking-normal transform scale-y-110 origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                                    {isArabic ? 'من نحن :' : 'ABOUT US :'}
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
                        <div className="w-full pt-6 md:pt-8 lg:pr-16">
                            <p className={`text-[14px] md:text-[15px] text-gray-600 leading-relaxed font-medium mb-10 ${isArabic ? 'text-right' : 'text-justify'}`}>
                                {isArabic ? (
                                    <>في شركة <strong className="text-black font-semibold">عبدالله بخيت للتجارة</strong>، نفخر ببناء علاقات قوية وطويلة الأمد مع كبرى الشركات في المملكة العربية السعودية. إن التزامنا بالجودة والموثوقية ورضا العملاء قد كسبنا ثقة المطاعم والفنادق وشركات الإعاشة وتجار الجملة والتجزئة الذين يعتمدون علينا للحصول على منتجات غذائية فاخرة.</>
                                ) : (
                                    <>At <strong className="text-black font-semibold">Abdullah Bakheet Trading Co.</strong>, we take pride in building strong, long-term relationships with leading businesses across Saudi Arabia. Our commitment to quality, reliability, and service excellence has earned us the trust of restaurants, hotels, caterers, wholesalers, and retailers who rely on us for premium food products.</>
                                )}
                            </p>

                            <Link
                                href="/products"
                                className="inline-flex items-center gap-2 border-b-2 border-black pb-1 text-base md:text-lg font-semibold hover:opacity-60 transition-opacity self-start tracking-wide group"
                            >
                                {t.knowMore}
                                <ArrowUpRightIcon size={22} className="text-black group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                            </Link>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
}