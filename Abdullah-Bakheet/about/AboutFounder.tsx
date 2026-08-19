"use client"
import { useShop } from '@/context/ShopContext';

export default function AboutFounder() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');

    return (
        <section className="w-full bg-brand-gray py-16 md:py-10 font-sans overflow-hidden">
            <div className="max-w-[1200px] mx-auto px-4 md:px-8 flex flex-col items-center">

                {/* Header Section */}
                <div className="font-heading flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mb-16 lg:mb-20">
                    <h2 className={`text-5xl md:text-6xl lg:text-[100px] uppercase text-[#1a2b25] leading-none tracking-wider scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                        {isArabic ? 'كلمة' : 'Words By'}
                    </h2>
                    <div className="bg-[#fbdc3c] px-4 md:px-6 pt-2 pb-1">
                        <h2 className={`text-5xl md:text-6xl lg:text-[100px] uppercase text-[#1a2b25] leading-none tracking-wider scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'مؤسسنا' : 'Our Founder'}
                        </h2>
                    </div>
                </div>

                {/* Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 w-full items-stretch">

                    {/* Left Column: Quote Box */}
                    <div className="relative bg-white p-8 md:p-12 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] flex flex-col justify-center">

                        {/* Top Left Quote Icon */}
                        <div className="absolute top-[-20px] left-8 md:left-12 text-gray-300">
                            <svg width="60" height="45" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="rotate-180">
                                <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                            </svg>
                        </div>

                        <p className={`text-[14px] md:text-[16px] text-gray-700 leading-relaxed font-medium relative z-10 mt-4 mb-4 ${isArabic ? 'text-right' : 'text-justify'}`}>
                            {isArabic ? (
                                <>في شركة <strong className="text-black font-bold uppercase">عبدالله بخيت للتجارة</strong>، تتجاوز مهمتنا مجرد توفير المنتجات الغذائية الفاخرة—نحن هنا لبناء شراكات مستدامة والارتقاء بقطاع الضيافة والتجزئة بالمملكة. بدأت رؤيتنا لسد الفجوة بين المصنعين العالميين والسوق المحلي، وتقديم منتجات عالية الجودة مدعومة بسلسلة توريد مبردة ولوجستيات موثوقة. نحن نؤمن بأن الثقة والالتزام بالجودة هما أساس كل نجاح، ونعمل باستمرار على تطوير خدماتنا لضمان تقديم التميز والدعم الكامل لجميع شركائنا في مختلف أنحاء المملكة.</>
                            ) : (
                                <>At <strong className="text-black font-bold uppercase">Abdullah Bakheet Trading Co.</strong>, our mission goes far beyond supplying food products—we are here to forge long-term partnerships and empower the hospitality and retail sectors across the Kingdom. We founded this company to bridge the gap between world-class international food producers and local businesses, delivering exceptional products backed by reliable cold chain logistics. We believe that trust and unwavering quality are the backbone of every success, and we continuously strive to innovate our service standards for all our partners across Saudi Arabia.</>
                            )}
                        </p>

                        {/* Bottom Right Quote Icon */}
                        <div className="absolute bottom-[-20px] right-8 md:right-12 text-gray-500">
                            <svg width="60" height="45" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" />
                            </svg>
                        </div>
                    </div>

                    {/* Right Column: Founder Image */}
                    <div className="w-full h-[400px] md:h-[400px] lg:h-[450px] bg-gray-100 overflow-hidden relative shadow-sm">
                        <img
                            src="/images/b22054ac3fcf29a0776a645093bbda2fc2666665.jpg"
                            alt={isArabic ? 'مؤسسنا' : 'Our Founder'}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 object-top"
                        />
                    </div>

                </div>
            </div>
        </section>
    );
}