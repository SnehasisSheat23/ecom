"use client"
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function WantToKnowMore() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.wantToKnowMore : translations.en.wantToKnowMore;

    return (
        <section className="w-full bg-brand-gray py-16 md:py-10 font-sans overflow-hidden">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8 flex flex-col">

                {/* Top Header Row */}
                <div className="font-heading flex flex-wrap items-center justify-center lg:justify-start gap-x-3 md:gap-x-6 gap-y-2 mb-12 md:mb-16">
                    <h2 className={`text-[12vw] md:text-[90px] lg:text-[110px] font-normal uppercase text-[#1a2b25] leading-[1] tracking-wide scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                        {t.wantTo}
                    </h2>

                    <div className="px-3 md:px-6 pt-5 pb-1 flex items-center justify-center">
                        <h2 className={`text-[12vw] md:text-[90px] lg:text-[110px] font-normal uppercase text-[#1a2b25] leading-[1] tracking-wide scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {t.know}
                        </h2>
                    </div>

                    <h2 className={`text-[12vw] md:text-[90px] lg:text-[110px] font-normal uppercase text-[#1a2b25] leading-[1] tracking-wide scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                        {t.more}
                    </h2>
                </div>

                {/* Content Row: Image + Text */}
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-10 lg:gap-16">

                    {/* Left: Product Image */}
                    <div className="w-full lg:w-[55%] bg-none flex items-center justify-center p-0 md:p-2">
                        <div className="relative w-full max-w-2xl h-[280px] md:h-[360px] lg:h-[420px] overflow-hidden rounded-none">
                            <Image
                                src="/images/food_supply_warehouse_logistics.jpg"
                                alt={isArabic ? "مركز التوزيع اللوجستي للأغذية" : "Food supply and logistics distribution center"}
                                fill
                                sizes="(min-width: 1024px) 55vw, 100vw"
                                className="object-cover object-center hover:scale-[1.02] transition-transform duration-700"
                            />
                        </div>
                    </div>

                    {/* Right: Text and Button CTA */}
                    <div className="w-full lg:w-[45%] flex flex-col justify-center pt-4 lg:pt-8 relative">

                        {/* Faint background pattern representation */}
                        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none -z-10"></div>

                        <p className={`text-[15px] md:text-[20px] text-gray-500 leading-relaxed font-medium mb-8 ${isArabic ? 'text-right' : 'text-justify lg:text-left'}`}>
                            {isArabic ? (
                                <>
                                    في شركة <strong className="text-black font-semibold">{t.companyName}</strong> للتجارة، نفخر ببناء علاقات قوية وطويلة الأمد مع الشركات الرائدة في جميع أنحاء المملكة العربية السعودية. إن التزامنا بالجودة والموثوقية والتميز في الخدمة قد كسبنا ثقة المطاعم والفنادق وشركات التموين وتجار الجملة والتجزئة الذين يعتمدون علينا للحصول على منتجات غذائية فاخرة.
                                </>
                            ) : (
                                <>
                                    At <strong className="text-black font-semibold">{t.companyName}</strong> {t.description}
                                </>
                            )}
                        </p>

                        <Link
                            href="/products"
                            className="bg-[#1a2b25] text-white px-8 py-4 flex items-center justify-center w-fit hover:bg-black transition-colors group"
                        >
                            <span className="text-base md:text-lg font-medium mr-3">{t.viewProducts}</span>
                            <ArrowUpRightIcon
                                size={22}
                                className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                            />
                        </Link>

                    </div>
                </div>

            </div>
        </section>
    );
}