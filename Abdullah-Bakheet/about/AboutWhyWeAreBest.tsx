"use client"
import React from 'react';
import { useShop } from '@/context/ShopContext';

export default function AboutWhyWeAreBest() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');

    const reasons = [
        {
            id: '01',
            title: isArabic ? 'عقود من الثقة والتميز' : 'Decades of Trust & Excellence',
            description: isArabic ? 'مع أكثر من عقدين من الزمن في طليعة توزيع الأغذية، تقدم شركة عبدالله بخيت للتجارة خبرة عميقة في هذا القطاع وسجلاً حافلاً من الموثوقية لكل شراكة. على مر السنين، أتقننا إدارة سلسلة التوريد، واللوجستيات المبردة، والمصادر في جميع أنحاء المملكة.' : 'With over two decades at the forefront of food distribution, Abdullah Bakheet Trading Co. brings deep industry expertise and an unwavering track record of reliability to every partnership. Over the years, we have mastered the complexities of supply chain management, temperature-controlled logistics, and market sourcing across Saudi Arabia.',
            image: "/images/26ecd8c11d1a7627d451935a0b08216dfe692877.jpg",
        },
        {
            id: '02',
            title: isArabic ? 'استيراد الأفضل دائمًا من العالم' : 'Sourcing the Best, Globally',
            description: isArabic ? 'التزامنا بالتميز لا يعرف حدودًا. من خلال الشراكة الحصرية مع العلامات التجارية العالمية، تجلب شركة عبدالله بخيت أجود المكونات مباشرة إلى المملكة. نختار كل شريك بعناية بناءً على معايير جودة صارمة تضمن نكهة أصيلة وتماسكًا عاليًا.' : 'Our commitment to excellence knows no borders. By partnering exclusively with world-class international brands, Abdullah Bakheet Trading Co. brings the globe\'s finest ingredients directly to Saudi Arabia. We carefully select each partner based on rigorous quality standards, ensuring that every product we distribute delivers authentic flavor, superior consistency.',
            image: "/images/5ddcac74b11df9dd4a3fcd5f317deaa20a03c148.jpg",
        },
        {
            id: '03',
            title: isArabic ? 'لوجستيات سلسة وموثوقة' : 'Seamless & Reliable Logistics',
            description: isArabic ? 'من لحظة تقديم الطلب حتى التسليم النهائي، تم تصميم سلسلة التوريد لدينا للسرعة والدقة والموثوقية. مدعومة بإدارة مخزون متقدمة أسطول مبرد، تضمن الشركة التوزيع السلس إلى كل أنحاء المملكة العربية السعودية.' : 'From the moment an order is placed to its final doorstep delivery, our supply chain is engineered for speed, accuracy, and reliability. Powered by advanced inventory management and a temperature-controlled fleet, Abdullah Bakheet Trading Co. ensures seamless distribution to every corner of Saudi Arabia. We eliminate logistics bottlenecks.',
            image: "/images/e85b6c3aa0bac31c26e2ecfc001fa0d2b87d652a.jpg",
        },
        {
            id: '04',
            title: isArabic ? 'حلول مخصصة للأعمال' : 'Tailored Solutions for Business',
            description: isArabic ? 'لكل عملية طهي متطلبات ممتازة. في شركة عبدالله بخيت للتجارة، نتجاوز التوزيع القياسي من خلال تقديم خدمات التوريد والتغليف المخصصة لجميع احتياجات عملائنا الكرام.' : 'Every culinary operation has distinct requirements, and off-the-shelf solutions don\'t always fit. At Abdullah Bakheet Trading Co., we go beyond standard distribution by offering tailored sourcing and custom packaging services. Whether you need high-volume bulk orders, niche international ingredients, or specific portion sizes and private-label packaging.',
            image: "/images/f80fb68d29406016fbe0fd41c081dbe15d70b847.jpg",
        }
    ];

    return (
        <section className="w-full bg-brand-gray py-16 md:py-10 font-sans">
            <div className="max-w-[1100px] mx-auto px-4 md:px-8 flex flex-col items-center">

                {/* Header */}
                <div className="font-heading flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-16">
                    <h2 className={`text-5xl md:text-6xl lg:text-[75px] uppercase text-[#1a2b25] leading-none tracking-wider scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                        {isArabic ? 'لماذا نحن' : 'Why We Are The'}
                    </h2>
                    <div className="bg-[#fbdc3c] px-4 md:px-6 pt-2 pb-1">
                        <h2 className={`text-5xl md:text-6xl lg:text-[75px] uppercase text-[#1a2b25] leading-none tracking-wider scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'الأفضل' : 'Best'}
                        </h2>
                    </div>
                </div>

                {/* Reasons List */}
                <div className="flex flex-col gap-10 md:gap-10 w-full">
                    {reasons.map((reason, index) => {
                        const isReversed = index % 2 !== 0;

                        return (
                            <div
                                key={reason.id}
                                className={`flex flex-col ${isReversed ? 'md:flex-row-reverse' : 'md:flex-row'} bg-white shadow-[0_4px_25px_-10px_rgba(0,0,0,0.06)] overflow-hidden w-full`}
                            >
                                {/* Text Content Block */}
                                <div className="w-full md:w-[55%] p-8 md:p-12 lg:p-12 flex flex-col justify-center">

                                    {/* Number Badge */}
                                    <div className="bg-[#fbdc3c] px-4 py-2 inline-block self-start mb-6">
                                        <span className="text-4xl md:text-5xl font-black text-[#1a2b25] leading-none tracking-tighter scale-y-110 transform origin-bottom block">
                                          {reason.id}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className={`text-2xl md:text-3xl font-black uppercase text-[#1a2b25] tracking-tighter scale-y-110 transform origin-bottom mb-6 leading-tight ${isArabic ? 'text-right' : 'text-left'}`}>
                                        {reason.title}
                                    </h3>

                                    {/* Description */}
                                    <p className={`text-[13px] md:text-[14px] text-gray-600 leading-relaxed font-medium ${isArabic ? 'text-right' : 'text-justify'}`}>
                                        {reason.description}
                                    </p>
                                </div>

                                {/* Image Block */}
                                <div className="w-full md:w-[45%] h-[300px] md:h-auto bg-gray-100 relative m-8 overflow-hidden group">
                                    <img
                                        src={reason.image}
                                        alt={reason.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                </div>

                            </div>
                        );
                    })}
                </div>

            </div>
        </section>
    );
}