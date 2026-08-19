"use client"
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function CategoriesSection() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.categories : translations.en.categories;

    const listCategories = [
        { label: t.list.ketchup, href: '/products?category=KETCHUP' },
        { label: t.list.vinegar, href: '/products?category=VINEGAR' },
        { label: t.list.pickles, href: '/products?category=PICKLES' },
        { label: t.list.cannedVeg, href: '/products?category=CANNED+FRUITS+%26+VEGETABLES' },
        { label: t.list.oils, href: '/products?category=OILS' },
        { label: t.list.sauces, href: '/products?category=SAUCES+%26+DRESSING' },
    ];

    const categoryCards = [
        {
            title: t.cards.frenchFriesTitle,
            desc: t.cards.frenchFriesDesc,
            img: '/images/5a78966bd8e588d4e65dd42f970c206cab2fdbe8.png',
            href: '/products?category=FRENCH+FRIES',
        },
        {
            title: t.cards.dryCondimentsTitle,
            desc: t.cards.dryCondimentsDesc,
            img: '/images/b35bcfd42719c75ce2155e5f4945742b75bce429.jpg',
            href: '/products?category=POWDERED+SPICES',
        },
        {
            title: t.cards.frozenItemsTitle,
            desc: t.cards.frozenItemsDesc,
            img: '/images/7a6cf875bde1e758b5dfefad9585ab5111043dbf.png',
            href: '/products?category=PICKLES',
        },
        {
            title: t.cards.seasoningsTitle,
            desc: t.cards.seasoningsDesc,
            img: '/images/5ea614e80b1750a6948242606b397619384dd64d.png',
            href: '/products?category=SAUCES+%26+DRESSING',
        },
    ];

    return (
        <section className="w-full bg-brand-gray py-10 font-sans">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8 flex flex-col gap-6">

                {/* Top Row: Featured Graphic & Category List */}
                <div className="flex flex-col lg:flex-row gap-6 h-auto lg:h-[550px]">

                    {/* Left: Featured Organic Mushrooms Graphic */}
                    <div className="w-full lg:w-1/2 relative bg-gray-200 overflow-hidden h-[400px] lg:h-full group">
                        {/* Background Image Placeholder */}
                        <img
                            src="/images/5a06489b13674891cd076609885d8e9807791780.png"
                            alt="Organic Mushrooms Banner"
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
                        />

                        {/* Top Left Badge */}
                        <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-3 shadow-lg z-10">
                            <div className="flex -space-x-2">
                                {/* Avatar placeholders */}
                                <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white overflow-hidden"><img src="/images/2f89f1d6351563c2e32bb15a51248d685d0cb97f.jpg" alt="Customer avatar 1" /></div>
                                <div className="w-8 h-8 rounded-full bg-gray-400 border-2 border-white overflow-hidden"><img src="/images/ea056b63d0093953138c02fe1d76530bab199c19.png" alt="Customer avatar 2" /></div>
                                <div className="w-8 h-8 rounded-full bg-gray-500 border-2 border-white overflow-hidden"><img src="/images/f39590362b619e09d7f750ea19f1b4d4358a07d5.png" alt="Customer avatar 3" /></div>
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-[13px] font-bold text-black">200 K</span>
                                <span className="text-[11px] text-gray-600 font-medium">{t.happyCustomers}</span>
                            </div>
                        </div>

                        {/* Bottom Right Badge */}
                        <Link
                            href="/products"
                            className="absolute bottom-6 right-6 bg-white rounded-full pl-2 pr-2 py-2 flex items-center gap-3 shadow-xl z-10 hover:bg-gray-50 transition-colors"
                        >
                            <span className="bg-[#1a2b25] text-white text-xs font-bold px-3 py-1.5 rounded-full">300 +</span>
                            <span className="text-sm font-semibold text-black pr-2">{t.productsSupplied}</span>
                            <div className="bg-black text-white p-1 rounded-full flex items-center justify-center w-7 h-7">
                                <ArrowUpRightIcon size={16} />
                            </div>
                        </Link>
                    </div>

                    {/* Right: Category List */}
                    <div className="w-full lg:w-1/2 bg-white p-8 lg:p-12 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] flex flex-col justify-center">

                        {/* Header */}
                        <div className="bg-[#fbdc3c] self-start px-6 py-4 mb-0">
                            <h2 className={`translate-y-2 font-heading text-5xl md:text-8xl font-normal uppercase text-[#1a2b25] tracking-normal leading-none transform scale-y-110 origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                                {t.title}
                            </h2>
                        </div>

                        {/* List */}
                        <ul className="flex flex-col w-full">
                            {listCategories.map((category, index) => (
                                <li key={index} className="w-full">
                                    <Link
                                        href={category.href}
                                        className="flex justify-between items-center w-full py-4 border-b border-gray-200 group hover:border-gray-400 transition-colors"
                                    >
                                        <span className={`text-lg font-bold text-gray-900 group-hover:text-black transition-colors ${isArabic ? 'text-right' : 'text-left'}`}>
                                            {category.label}
                                        </span>
                                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center group-hover:bg-[#fbdc3c] group-hover:text-black transition-all">
                                            <ArrowUpRightIcon size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Bottom Row: Category Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-2">
                    {categoryCards.map((card, index) => (
                        <div
                            key={index}
                            className="bg-white p-6 md:p-8 flex flex-col shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] transition-shadow duration-300 group"
                        >
                            {/* Product Image Area */}
                            <div className="w-full h-[180px] flex items-center justify-center mb-6 relative">
                                <img
                                    src={card.img}
                                    alt={card.title}
                                    className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500"
                                />
                            </div>

                            {/* Text Content */}
                            <div className="flex flex-col flex-grow">
                                <h3 className={`text-lg font-bold text-gray-900 mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>{card.title}</h3>
                                <p className={`text-sm text-gray-500 leading-relaxed font-medium mb-6 flex-grow ${isArabic ? 'text-right' : 'text-left'}`}>
                                    {card.desc}
                                </p>

                                {/* See More Button */}
                                <Link
                                    href={card.href}
                                    className="bg-[#1a2b25] text-white text-sm font-semibold py-2.5 px-6 rounded-full self-start hover:bg-black transition-colors"
                                >
                                    {t.seeMore}
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </section>
    );
}