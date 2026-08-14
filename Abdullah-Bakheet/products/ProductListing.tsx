'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CartIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { fetchProducts, fetchCategories, StorefrontProduct } from '@/lib/api';
import Link from 'next/link';

const ToggleSwitch = ({ label, isActive, onClick, isArabic }: { label: string; isActive?: boolean; onClick?: () => void; isArabic?: boolean }) => (
    <button onClick={onClick} className={`flex items-center gap-3 w-full group py-1.5 cursor-pointer ${isArabic ? 'flex-row-reverse text-right' : 'text-left'}`}>
        <div className={`w-8 h-4 rounded-full relative transition-colors duration-300 ${isActive ? 'bg-[#1a2b25]' : 'bg-gray-200'}`}>
            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300 ${isActive ? 'translate-x-4' : 'translate-x-0 shadow-sm'}`} />
        </div>
        <span className={`text-[11px] font-bold tracking-wide uppercase transition-colors ${isActive ? 'text-black' : 'text-gray-400 group-hover:text-gray-600'}`}>
            {label}
        </span>
    </button>
);

export default function ProductListing() {
    const router = useRouter();
    const { addToCart, currency, language, formatPrice } = useShop();
    const isArabic = language.startsWith('Arabic');

    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<StorefrontProduct[]>([]);
    const [categories, setCategories] = useState<Array<{ name: string; arabicName?: string; slug: string }>>([
        { name: 'ALL', arabicName: 'الكل', slug: 'ALL' }
    ]);
    const [activeCategory, setActiveCategory] = useState<string>('ALL');
    const [priceRange, setPriceRange] = useState(2000);
    const [onSaleOnly, setOnSaleOnly] = useState(false);
    const [inStockOnly, setInStockOnly] = useState(false);

    useEffect(() => {
        let isMounted = true;
        async function loadBackendData() {
            try {
                const [backendProds, backendCats] = await Promise.all([
                    fetchProducts(60),
                    fetchCategories(60),
                ]);
                if (isMounted) {
                    if (backendProds.length > 0) {
                        setProducts(backendProds);
                    }
                    if (backendCats.length > 0) {
                        const formattedCats = backendCats.map(c => ({
                            name: c.name.toUpperCase(),
                            arabicName: c.arabicName || c.name,
                            slug: c.slug || c.id,
                        }));
                        setCategories([{ name: 'ALL', arabicName: 'الكل', slug: 'ALL' }, ...formattedCats]);
                    }
                }
            } catch (err) {
                console.error('Error fetching live product data:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        loadBackendData();
        return () => { isMounted = false; };
    }, []);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            if (activeCategory && activeCategory !== 'ALL' && product.category.toUpperCase() !== activeCategory.toUpperCase()) {
                return false;
            }
            if (product.price > priceRange) {
                return false;
            }
            if (onSaleOnly && !product.onSale) {
                return false;
            }
            if (inStockOnly && !product.inStock) {
                return false;
            }
            return true;
        });
    }, [products, activeCategory, priceRange, onSaleOnly, inStockOnly]);

    return (
        <section className="w-full bg-brand-gray py-16 font-sans">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8">

                {/* Header Section */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-16">
                    <div className="w-full lg:w-[55%]">
                        <h2 className={`font-heading text-[12vw] md:text-[70px] lg:text-[92px] uppercase text-black leading-[1] tracking-normal scale-y-110 transform origin-bottom flex flex-wrap items-center gap-x-4 ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                            {isArabic ? 'منتجاتنا' : 'OUR'}
                            <span className="bg-[#fbdc3c] px-4 pt-1">{isArabic ? 'المميزة' : 'PRODUCTS'}</span>
                            {isArabic ? 'التي تجعلنا نختلف دائمًا' : 'THAT MAKES US DIFFERENT'}
                        </h2>
                    </div>

                    <div className="w-full lg:w-[40%]">
                        <p className={`text-[13px] md:text-[14px] text-gray-600 leading-relaxed font-medium ${isArabic ? 'text-right' : 'text-justify'}`}>
                            {isArabic ? (
                                <>الشراكات القوية هي جوهر كل ما نقوم به. لقد كسبنا ثقة أرقى المطاعم والفنادق وشركات الإعاشة والموزعين في المملكة العربية السعودية من خلال توريد منتجات غذائية فاخرة مدعومة بخدمة مخصصة وموثوقة. التزامنا بالتميز لا يعرف حدودًا.</>
                            ) : (
                                <>Strong partnerships are at the heart of everything we do. We&#39;ve earned the lasting trust of Saudi Arabia&#39;s finest restaurants, hotels, caterers, and distributors by providing premium food supplies paired with dedicated, reliable service. Our commitment to excellence knows no borders. By partnering exclusively with world-class international brands, Abdullah Bakheet brings the globe&#39;s finest ingredients directly to Saudi Arabia.</>
                            )}
                        </p>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* Left Sidebar Filters */}
                    <aside className="w-full lg:w-[320px] flex-shrink-0 h-fit bg-[#fefefe] shadow-[0_0_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100/50 p-6 md:p-8 rounded-sm lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">

                        {/* Filter Header */}
                        <div className="bg-[#fbdc3c] py-3 px-5 mb-10 inline-block w-full">
                            <h3 className={`font-heading text-5xl uppercase text-center text-[#1a2b25] tracking-normal transform scale-y-110 origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100' : ''}`}>
                                {isArabic ? 'تصفية المنتجات' : 'Product Filter'}
                            </h3>
                        </div>

                        {/* Pricing Filter */}
                        <div className="mb-10">
                            <h4 className={`font-black text-lg uppercase text-black tracking-wide mb-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'نطاق السعر' : 'Pricing Bar'}
                            </h4>
                            <div className="flex justify-between items-center mb-4 text-xs font-bold text-gray-500">
                                <span>{isArabic ? 'السعر' : 'PRICING'}</span>
                                <span className="bg-[#fbdc3c] text-black px-2 py-0.5 rounded-sm">{currency} {priceRange}</span>
                            </div>

                            {/* Custom Range Slider */}
                            <div className="relative w-full h-2 bg-gray-200 rounded-full mb-4">
                                <div className="absolute top-0 left-0 h-full bg-[#1a2b25] rounded-full" style={{ width: `${(priceRange / 2000) * 100}%` }}></div>
                                <input
                                    type="range"
                                    min="50"
                                    max="2000"
                                    step="10"
                                    value={priceRange}
                                    onChange={(e) => setPriceRange(Number(e.target.value))}
                                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 bg-[#1a2b25] rounded-full border-2 border-white shadow-md"></div>
                                <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-4 border-[#1a2b25] shadow-md cursor-grab active:cursor-grabbing pointer-events-none" style={{ left: `calc(${Math.min(Math.max((priceRange / 2000) * 100, 0), 96)}% - 8px)` }}></div>
                            </div>
                            <div className="flex justify-between items-center text-[11px] font-bold text-black">
                                <span>{currency} 50</span>
                                <span>{currency} 2000</span>
                            </div>
                        </div>

                        {/* Categories Filter */}
                        <div className="mb-10">
                            <h4 className={`font-black text-lg uppercase text-black tracking-wide mb-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'الأقسام' : 'Categories'}
                            </h4>
                            <div className="flex flex-col gap-3">
                                {categories.map((catObj) => (
                                    <ToggleSwitch
                                        key={catObj.slug}
                                        label={isArabic ? (catObj.arabicName || catObj.name) : catObj.name}
                                        isActive={activeCategory === catObj.slug}
                                        onClick={() => setActiveCategory(activeCategory === catObj.slug ? 'ALL' : catObj.slug)}
                                        isArabic={isArabic}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Stock Filter */}
                        <div>
                            <h4 className={`font-black text-lg uppercase text-black tracking-wide mb-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'تصفية المخزون' : 'Stock Filter'}
                            </h4>
                            <div className="flex flex-col gap-3">
                                <ToggleSwitch 
                                    label={isArabic ? 'المنتجات المخفضة' : 'ON SALE'} 
                                    isActive={onSaleOnly}
                                    onClick={() => setOnSaleOnly(!onSaleOnly)}
                                    isArabic={isArabic}
                                />
                                <ToggleSwitch 
                                    label={isArabic ? 'المتوفر في المخزون' : 'IN STOCK'} 
                                    isActive={inStockOnly}
                                    onClick={() => setInStockOnly(!inStockOnly)}
                                    isArabic={isArabic}
                                />
                            </div>
                        </div>

                    </aside>

                    {/* Right Product Grid */}
                    <div className="flex-1 w-full">
                        {isLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                    <div key={n} className="bg-white p-5 rounded-md border border-gray-100 animate-pulse h-[340px] flex flex-col justify-between">
                                        <div className="w-16 h-4 bg-gray-200/80 rounded" />
                                        <div className="w-full h-32 bg-gray-200/80 rounded-md my-4" />
                                        <div className="space-y-2">
                                            <div className="w-3/4 h-4 bg-gray-200/80 rounded" />
                                            <div className="w-1/2 h-4 bg-gray-200/80 rounded" />
                                            <div className="w-full h-8 bg-gray-200/80 rounded-full mt-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-md shadow-sm border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {isArabic ? 'لم يتم العثور على منتجات' : 'No products found'}
                                </h3>
                                <p className="text-sm text-gray-500 mb-4">
                                    {isArabic ? 'جرب تعديل خيارات التصفية أو شريط نطاق السعر لرؤية المزيد من المنتجات.' : 'Try adjusting your filters or price slider to see more products.'}
                                </p>
                                <button
                                    onClick={() => {
                                        setActiveCategory('ALL');
                                        setPriceRange(2000);
                                        setOnSaleOnly(false);
                                        setInStockOnly(false);
                                    }}
                                    className="bg-brand-dark text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors"
                                >
                                    {isArabic ? 'إعادة ضبط الخيارات' : 'Reset Filters'}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                                {filteredProducts.map((product) => (
                                    <Link
                                        href={`/products/${product.id}`}
                                        key={product.id}
                                        className="bg-white p-5 rounded-md shadow-[0_2px_15px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1)] transition-shadow border border-gray-50 flex flex-col group relative block"
                                    >
                                        {/* Featured / On Sale Tag */}
                                        <div className="flex items-center gap-1.5 absolute top-5 left-5">
                                            <span className="text-[10px] font-medium text-gray-500">{isArabic ? 'مميز' : 'Featured'}</span>
                                            {product.onSale && (
                                                <span className="bg-brand-yellow text-black text-[9px] font-bold px-1.5 py-0.5 rounded-xs uppercase">
                                                    {isArabic ? 'تخفيض' : 'Sale'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Product Image */}
                                        <div className="w-full h-[160px] flex items-center justify-center mt-6 mb-6">
                                            <img
                                                src={product.img}
                                                alt={product.title}
                                                className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>

                                        {/* Product Info */}
                                        <div className="mt-auto">
                                            <h4 className={`text-[13px] font-bold text-black uppercase leading-snug tracking-wide line-clamp-2 min-h-[36px] ${isArabic ? 'text-right dir-rtl font-sans' : 'text-left'}`}>
                                                {isArabic ? (product.arabic || product.title) : product.title} <br/> <span className="text-gray-500 font-medium text-[11px]">{product.size}</span>
                                            </h4>
                                            {isArabic ? (
                                                <p className="text-xs text-gray-500 mt-1 mb-3 font-medium text-right dir-ltr font-sans">{product.title}</p>
                                            ) : (
                                                product.arabic && (
                                                    <p className="text-xs text-gray-600 mt-1 mb-3 font-medium text-right dir-rtl font-sans">{product.arabic}</p>
                                                )
                                            )}

                                            <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-2">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[15px] text-black">{formatPrice(product.price)}</span>
                                                    {product.moq && product.moq > 1 && (
                                                        <span className="text-[10px] font-bold text-amber-700">
                                                            {isArabic ? `الحد الأدنى: ${product.moq}` : `MOQ: ${product.moq}`}
                                                        </span>
                                                    )}
                                                </div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        addToCart({
                                                            id: product.id,
                                                            variantId: product.variantId,
                                                            name: isArabic ? (product.arabic || product.title) : product.title,
                                                            category: product.category,
                                                            price: product.price,
                                                            image: product.img || '',
                                                            moq: product.moq,
                                                        });
                                                    }}
                                                    className="flex items-center gap-1.5 border border-gray-200 rounded-full px-3 py-1.5 hover:bg-[#1a2b25] hover:text-white hover:border-[#1a2b25] transition-all group/btn cursor-pointer z-10 relative"
                                                >
                                                    <CartIcon size={13} className="text-gray-600 group-hover/btn:text-white transition-colors" />
                                                    <span className="text-[10px] font-bold text-gray-700 group-hover/btn:text-white transition-colors">
                                                        {isArabic ? 'إضافة للسلة' : 'Add to cart'}
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </section>
    );
}
