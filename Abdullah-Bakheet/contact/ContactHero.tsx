"use client";
import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-animated";
import { useShop } from "@/context/ShopContext";

export default function ContactHero() {
  const { language } = useShop();
  const isArabic = language.startsWith("Arabic");

  return (
    <section className="w-full bg-brand-gray py-12 md:py-10 font-sans">
      <div className="max-w-[1300px] max-h-auto mx-auto px-4 md:px-8 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Left Column (63% width on desktop) */}
        <div className="w-full lg:w-[63%] flex flex-col gap-6 md:gap-8">
          {/* Top Banner: LET'S TALK */}
          <div className="w-full flex h-[100px] md:h-[150px] items-stretch gap-4 md:gap-6 overflow-hidden">
            {/* Yellow Box */}
            <div className="flex-1 bg-[#fbdc3c] flex items-center px-6 md:p-10">
              <h2 className={`font-heading text-6xl md:text-[129px] pt-6 uppercase text-[#1a2b25] leading-none tracking-wider transform scale-y-110 origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                {isArabic ? "تواصل معنا" : "LET'S TALK"}
              </h2>
            </div>

            {/* Starburst Graphic Container */}
            <div className="w-[100px] md:w-[130px] flex-shrink-0 flex items-center justify-center border-y border-transparent">
              <svg
                width="119"
                height="122"
                viewBox="0 0 119 122"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M61 0L62.9615 56.2662L104.133 17.8667L65.7349 59.0396L122 61L65.7338 62.9615L104.133 104.133L62.9615 65.7349L61 122L59.0396 65.7338L17.8667 104.133L56.2651 62.9615L0 61L56.2662 59.0396L17.8667 17.8667L59.0396 56.2651L61 0Z"
                  fill="#1F312E"
                />
              </svg>
            </div>

            {/* Right Yellow Block */}
            <div className="w-[30px] md:w-[50px] flex-shrink-0 bg-[#fbdc3c]"></div>
          </div>

          {/* Description Paragraph & Link */}
          <div className="w-full pr-4 lg:pr-12">
            <p className={`text-[14px] md:text-[20px] text-gray-600 leading-relaxed font-medium mb-6 ${isArabic ? 'text-right' : 'text-justify'}`}>
              {isArabic ? (
                <>حلول توريد مخصصة لجميع الأحجام. سواء كنت تبحث عن مكونات متخصصة أو تود التوسع في عمليات الشراء بالجملة، تقدم شركة <strong className="text-black font-semibold">عبدالله بخيت للتجارة</strong> حلولاً مصممة لخدمة أعمالك. نحن نتولى الاستيراد والتعبئة واللوجستيات لضمان حصولك على الكميات المطلوبة بأعلى دقة دون عناء.</>
              ) : (
                <>Tailored supply solutions for every scale. Whether you&#39;re sourcing specialized ingredients or scaling up with bulk procurement, <strong className="text-black font-semibold">Abdullah Bakheet Trading Co.</strong> delivers custom solutions built around your business. We handle the sourcing, custom packaging, and logistics—so you get exact quantities, specialized specs, and zero hassle.</>
              )}
            </p>

            <Link
              href="/products"
              className="inline-flex items-center gap-2 border-b-2 border-black pb-1 text-base md:text-[17px] font-semibold hover:opacity-60 transition-opacity self-start tracking-wide group"
            >
              {isArabic ? "منتجاتنا" : "Our Products"}
              <ArrowUpRightIcon
                size={22}
                className="text-black group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
              />
            </Link>
          </div>

          {/* Bottom Grid: Dark Box + Building Image */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-none items-end">
            {/* Dark Green Brand Box */}
            <div className="w-full h-[320px] md:h-[300px] bg-[#22322a] p-6 md:p-8 flex flex-col justify-between relative overflow-hidden shadow-sm">
              <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-white/5 rounded-full blur-sm pointer-events-none"></div>
              <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/5 rounded-full blur-sm pointer-events-none"></div>

              <h3 className={`font-heading text-[26px] md:text-[32px] lg:text-4xl uppercase text-white leading-none tracking-wider mb-2 relative z-10 transform scale-y-110 origin-bottom pr-4 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100 text-right' : ''}`}>
                {isArabic ? "شركة عبدالله بخيت للتجارة" : "Abdullah Bakheet Trading Company"}
              </h3>
              <p className={`text-[12px] md:text-[15px] text-gray-300 leading-relaxed font-medium relative z-10 pr-2 ${isArabic ? 'text-right' : 'text-justify'}`}>
                {isArabic ? "تُبنى الثقة على الجودة والاستمرارية. في شركة عبدالله بخيت للتجارة، نمكّن قطاعات الضيافة والتجزئة والجملة بالمملكة من خلال توفير منتجات غذائية فاخرة مدعومة بموثوقية عالية وخدمة متميزة." : "Trust is built on quality and consistency. At Abdullah Bakheet Trading Co., we empower Saudi Arabia's premier hospitality, retail, and wholesale businesses by delivering high-caliber food products backed by unmatched reliability and service excellence."}
              </p>
            </div>

            {/* Building Image */}
            <div className="w-full h-[320px] md:h-[400px] bg-gray-100 overflow-hidden relative shadow-sm">
              <img
                src="https://www.dropbox.com/scl/fi/d3cfs4jr337wjffqi12jy/939a574cbba7559a1c3bd7d055026bc77d8899d5.png?rlkey=v412gcsow26zvudqbtdqxdrh6&st=nmilevxt&raw=1"
                alt={isArabic ? "مقر الشركة" : "Modern Architecture Building"}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 object-bottom"
              />
            </div>
          </div>
        </div>

        {/* Right Column (37% width on desktop) */}
        <div className="w-full lg:w-[37%] flex flex-col gap-6 md:gap-8">
          {/* 300+ Products Stats Box */}
          <div className="w-full bg-white p-8 md:p-10 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-gray-50 flex flex-col relative overflow-hidden group">
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <span className="text-[140px] font-black leading-none">AB</span>
            </div>

            <div className="flex justify-between items-start mb-4 relative z-10">
              <h3 className="font-heading text-5xl md:text-[60px] uppercase text-black leading-none tracking-wider transform scale-y-110 origin-bottom">
                300+
              </h3>
              <Link
                href="/products"
                className="w-11 h-11 bg-black rounded-full flex items-center justify-center hover:bg-[#1a2b25] transition-colors shrink-0"
              >
                <ArrowUpRightIcon size={22} className="text-white" />
              </Link>
            </div>

            <h4 className={`font-heading text-lg md:text-4xl uppercase text-black tracking-wider mb-4 relative z-10 transform scale-y-110 origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100 text-right' : ''}`}>
              {isArabic ? "منتج متوفر" : "Products Available"}
            </h4>

            <p className={`text-[15px] text-gray-500 leading-relaxed font-medium relative z-10 ${isArabic ? 'text-right' : 'text-justify'}`}>
              {isArabic ? "نبني شراكات مستدامة عبر تقديم أسعار تنافسية ولوجستيات سلسة وحلول مخصصة لدعم نمو عملائنا." : "We build lasting partnerships by offering competitive pricing, seamless logistics, and tailored solutions to support our clients' growth"}
            </p>
          </div>

          {/* Sun Dried Tomatoes Image */}
          <div className="w-full h-[400px] md:h-auto flex-grow bg-gray-100 overflow-hidden relative shadow-sm min-h-[350px]">
            <img
              src="https://www.dropbox.com/scl/fi/p368xixquk9sf4b1b4opg/60c191d3da71d6d25e508bb753e355df4b36ddd6.png?rlkey=ufwm9zudj52gwtova1bvkgmi5&st=83vje8ix&raw=1"
              alt={isArabic ? "طماطم مجففة بالشمس" : "Sun Dried Tomatoes Packaging"}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

