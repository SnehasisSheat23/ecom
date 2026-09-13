'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CartIcon } from 'lucide-animated';
import { SlidersHorizontal, X, RotateCcw } from 'lucide-react';
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

function normalizeStr(str: string): string {
    return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export default function ProductListing() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const urlCategory = searchParams.get('category');

    const { addToCart, currency, language, formatPrice, isCorporateUser } = useShop();
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
    const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (priceRange < 2000) count += 1;
        if (onSaleOnly) count += 1;
        if (inStockOnly) count += 1;
        return count;
    }, [priceRange, onSaleOnly, inStockOnly]);

    useEffect(() => {
        let isMounted = true;
        async function loadBackendData() {
            try {
                const [backendProds, backendCats] = await Promise.all([
                    fetchProducts({ limit: 60, currency, lang: isArabic ? 'ar' : 'en' }),
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
    }, [currency, isArabic]);

    // Lock body scrolling when mobile bottom sheet is active
    useEffect(() => {
        if (mobileFilterOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileFilterOpen]);

    // Synchronize category from URL search params (?category=...)
    useEffect(() => {
        if (!urlCategory) {
            setActiveCategory('ALL');
            return;
        }

        const normParam = normalizeStr(urlCategory);
        if (!normParam || normParam === 'all') {
            setActiveCategory('ALL');
            return;
        }

        // Try exact match on slug or name in categories
        const matchedCat = categories.find(c => 
            c.slug.toLowerCase() === urlCategory.toLowerCase() ||
            c.name.toUpperCase() === urlCategory.toUpperCase() ||
            normalizeStr(c.slug) === normParam ||
            normalizeStr(c.name) === normParam ||
            normalizeStr(c.name).includes(normParam) ||
            normParam.includes(normalizeStr(c.name))
        );

        if (matchedCat) {
            setActiveCategory(matchedCat.slug || matchedCat.name);
        } else {
            // Check products directly
            const matchedProd = products.find(p => {
                const normCat = normalizeStr(p.category);
                const normSlug = normalizeStr(p.categorySlug || '');
                return normCat === normParam || normSlug === normParam || normCat.includes(normParam) || normParam.includes(normCat);
            });
            if (matchedProd) {
                setActiveCategory(matchedProd.category);
            } else {
                setActiveCategory(urlCategory);
            }
        }
    }, [urlCategory, categories, products]);

    const handleCategoryClick = useCallback((targetSlugOrName: string) => {
        if (targetSlugOrName === 'ALL' || targetSlugOrName === activeCategory) {
            setActiveCategory('ALL');
            router.replace('/products', { scroll: false });
        } else {
            setActiveCategory(targetSlugOrName);
            router.replace(`/products?category=${encodeURIComponent(targetSlugOrName)}`, { scroll: false });
        }
    }, [activeCategory, router]);

    const isCatActive = useCallback((catObj: { name: string; slug: string }) => {
        if (activeCategory === 'ALL' && (catObj.slug === 'ALL' || catObj.name === 'ALL')) return true;
        if (activeCategory === 'ALL') return false;

        const normActive = normalizeStr(activeCategory);
        const normSlug = normalizeStr(catObj.slug);
        const normName = normalizeStr(catObj.name);

        return (
            activeCategory.toLowerCase() === catObj.slug.toLowerCase() ||
            activeCategory.toUpperCase() === catObj.name.toUpperCase() ||
            normActive === normSlug ||
            normActive === normName ||
            normName.includes(normActive) ||
            normActive.includes(normName)
        );
    }, [activeCategory]);

    const filteredProducts = useMemo(() => {
        return products.filter((product) => {
            if (activeCategory && activeCategory !== 'ALL') {
                const normActive = normalizeStr(activeCategory);
                const normProdCat = normalizeStr(product.category);
                const normProdSlug = normalizeStr(product.categorySlug || '');

                const isMatch = (
                    product.category.toUpperCase() === activeCategory.toUpperCase() ||
                    normProdCat === normActive ||
                    normProdSlug === normActive ||
                    normProdCat.includes(normActive) ||
                    normActive.includes(normProdCat) ||
                    (normProdSlug && (normProdSlug.includes(normActive) || normActive.includes(normProdSlug)))
                );

                if (!isMatch) return false;
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
        <section className="w-full bg-brand-gray pt-4 md:pt-10 pb-16 font-sans">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8">

                {/* Header Section */}
                <div className="mb-4 md:mb-8">
                    <h2 className={`font-heading text-[10vw] md:text-[60px] lg:text-[76px] uppercase text-black leading-[1] tracking-normal scale-y-110 transform origin-bottom ${isArabic ? 'font-sans font-black tracking-tight scale-y-100 text-right' : 'text-left'}`}>
                        {isArabic ? 'منتجاتنا' : 'OUR PRODUCTS'}
                    </h2>
                </div>

                {/* Mobile UX-Friendly Horizontal Category Pills Bar & Filter Trigger */}
                <div className="lg:hidden w-full mb-6 flex flex-col gap-3">
                    {/* Top Row: Items Count + Filter Button */}
                    <div className={`flex items-center justify-between gap-2 ${isArabic ? 'flex-row-reverse' : ''}`}>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
                                {isArabic ? 'الأقسام' : 'Categories'}
                            </span>
                            <span className="text-[10px] font-bold bg-white text-gray-700 px-2 py-0.5 rounded-full border border-gray-200">
                                {filteredProducts.length} {isArabic ? 'منتج' : 'items'}
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border shadow-xs active:scale-95 cursor-pointer ${
                                activeFiltersCount > 0
                                    ? 'bg-[#1a2b25] text-white border-[#1a2b25]'
                                    : 'bg-white text-gray-800 border-gray-200 hover:border-gray-400'
                            } ${isArabic ? 'flex-row-reverse' : ''}`}
                        >
                            <SlidersHorizontal size={13} />
                            <span>{isArabic ? 'تصفية' : 'Filters'}</span>
                            {activeFiltersCount > 0 && (
                                <span className="bg-[#fbdc3c] text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Horizontal Category Chips (Smooth Horizontal Scroll) */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-0.5 scrollbar-none -mx-4 px-4 md:-mx-8 md:px-8">
                        {categories.map((catObj) => {
                            const active = isCatActive(catObj);
                            return (
                                <button
                                    key={catObj.slug}
                                    type="button"
                                    onClick={() => handleCategoryClick(catObj.slug)}
                                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap active:scale-95 cursor-pointer ${
                                        active
                                            ? 'bg-[#1a2b25] text-white shadow-sm ring-2 ring-[#1a2b25]/20'
                                            : 'bg-white text-gray-700 border border-gray-200/90 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {isArabic ? (catObj.arabicName || catObj.name) : catObj.name}
                                </button>
                            );
                        })}
                    </div>

                    {/* Mobile Bottom Sheet Filter Modal */}
                    {mobileFilterOpen && (
                        <div className="fixed inset-0 z-50 flex items-end justify-center">
                            {/* Backdrop */}
                            <div 
                                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fadeIn cursor-pointer"
                                onClick={() => setMobileFilterOpen(false)}
                            />

                            {/* Sheet Content */}
                            <div 
                                className="relative w-full max-w-lg bg-white rounded-t-[28px] shadow-2xl z-10 max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Sheet Drag Handle */}
                                <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mt-3 mb-1" />

                                {/* Sheet Header */}
                                <div className={`flex items-center justify-between px-6 py-3 border-b border-gray-100 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-base uppercase tracking-wider text-black">
                                            {isArabic ? 'تصفية المنتجات' : 'Filter Products'}
                                        </h3>
                                        {activeFiltersCount > 0 && (
                                            <span className="bg-[#fbdc3c] text-black text-[11px] font-black px-2 py-0.5 rounded-full">
                                                {activeFiltersCount}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setMobileFilterOpen(false)}
                                        className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
                                        aria-label="Close filters"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {/* Sheet Body (Scrollable) */}
                                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                                    {/* Categories in Sheet */}
                                    <div>
                                        <h4 className={`font-bold text-xs uppercase text-gray-500 tracking-wider mb-3 ${isArabic ? 'text-right' : 'text-left'}`}>
                                            {isArabic ? 'الأقسام' : 'Categories'}
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map((catObj) => {
                                                const active = isCatActive(catObj);
                                                return (
                                                    <button
                                                        key={catObj.slug}
                                                        type="button"
                                                        onClick={() => handleCategoryClick(catObj.slug)}
                                                        className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                                                            active
                                                                ? 'bg-[#1a2b25] text-white shadow-xs'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {isArabic ? (catObj.arabicName || catObj.name) : catObj.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Price Range Slider */}
                                    <div className="border-t border-gray-100 pt-5">
                                        <div className={`flex justify-between items-center mb-3 text-xs font-bold text-gray-700 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                            <span className="uppercase tracking-wider">{isArabic ? 'نطاق السعر الأقصى' : 'Max Price'}</span>
                                            <span className="bg-[#fbdc3c] text-black px-2.5 py-1 rounded-sm font-black text-xs">
                                                {isArabic ? `${priceRange} ${(currency === 'SAR' || !currency) ? 'ر.س' : currency}` : `${currency} ${priceRange}`}
                                            </span>
                                        </div>
                                        <div className="relative w-full h-2 bg-gray-200 rounded-full mb-3">
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
                                        <div className={`flex justify-between text-[11px] font-bold text-gray-500 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                            <span>{isArabic ? `50 ${(currency === 'SAR' || !currency) ? 'ر.س' : currency}` : `${currency} 50`}</span>
                                            <span>{isArabic ? `2000 ${(currency === 'SAR' || !currency) ? 'ر.س' : currency}` : `${currency} 2000`}</span>
                                        </div>
                                    </div>

                                    {/* Stock & Discount Toggles */}
                                    <div className="border-t border-gray-100 pt-5 space-y-3">
                                        <h4 className={`font-bold text-xs uppercase text-gray-500 tracking-wider mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                                            {isArabic ? 'حالة التوفر' : 'Availability & Offers'}
                                        </h4>
                                        <ToggleSwitch
                                            label={isArabic ? 'المنتجات المخفضة فقط' : 'ON SALE ONLY'}
                                            isActive={onSaleOnly}
                                            onClick={() => setOnSaleOnly(!onSaleOnly)}
                                            isArabic={isArabic}
                                        />
                                        <ToggleSwitch
                                            label={isArabic ? 'المتوفر في المخزون فقط' : 'IN STOCK ONLY'}
                                            isActive={inStockOnly}
                                            onClick={() => setInStockOnly(!inStockOnly)}
                                            isArabic={isArabic}
                                        />
                                    </div>
                                </div>

                                {/* Sheet Sticky Bottom Action Bar */}
                                <div className={`p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex items-center gap-3 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveCategory('ALL');
                                            setPriceRange(2000);
                                            setOnSaleOnly(false);
                                            setInStockOnly(false);
                                        }}
                                        className="py-3 px-4 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <RotateCcw size={14} />
                                        <span>{isArabic ? 'إعادة ضبط' : 'Reset All'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMobileFilterOpen(false)}
                                        className="flex-1 py-3 px-6 rounded-xl bg-[#1a2b25] text-white text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors shadow-md cursor-pointer text-center"
                                    >
                                        {isArabic ? `عرض (${filteredProducts.length}) منتج` : `Show (${filteredProducts.length}) Products`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Layout */}
                <div className="flex flex-col lg:flex-row gap-8 items-start">

                    {/* Left Sidebar Filters (Desktop Only) */}
                    <aside className="hidden lg:block w-[320px] flex-shrink-0 h-fit bg-[#fefefe] shadow-[0_0_20px_-10px_rgba(0,0,0,0.05)] border border-gray-100/50 p-6 md:p-8 rounded-sm lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">

                        {/* Pricing Filter */}
                        <div className="mb-10">
                            <h4 className={`font-black text-lg uppercase text-black tracking-wide mb-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                                {isArabic ? 'نطاق السعر' : 'Pricing Bar'}
                            </h4>
                            <div className="flex justify-between items-center mb-4 text-xs font-bold text-gray-500">
                                <span>{isArabic ? 'السعر' : 'PRICING'}</span>
                                <span className="bg-[#fbdc3c] text-black px-2 py-0.5 rounded-sm">
                                    {isArabic ? `${priceRange} ${(currency === 'SAR' || !currency) ? 'ر.س' : currency}` : `${currency} ${priceRange}`}
                                </span>
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
                                <span>{isArabic ? `50 ${(currency === 'SAR' || !currency) ? 'ر.س' : currency}` : `${currency} 50`}</span>
                                <span>{isArabic ? `2000 ${(currency === 'SAR' || !currency) ? 'ر.س' : currency}` : `${currency} 2000`}</span>
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
                                        isActive={isCatActive(catObj)}
                                        onClick={() => handleCategoryClick(catObj.slug)}
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
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                    <div key={n} className="bg-white p-3 sm:p-5 rounded-2xl border border-gray-100 animate-pulse h-full flex flex-col justify-between">
                                        <div className="w-12 sm:w-16 h-3 sm:h-4 bg-gray-200/80 rounded" />
                                        <div className="w-full aspect-[4/3] bg-gray-200/80 rounded-xl my-2 sm:my-4" />
                                        <div className="space-y-2">
                                            <div className="w-3/4 h-3 sm:h-4 bg-gray-200/80 rounded" />
                                            <div className="w-1/2 h-3 sm:h-4 bg-gray-200/80 rounded" />
                                            <div className="w-full h-7 sm:h-8 bg-gray-200/80 rounded-full mt-2 sm:mt-4" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="bg-white p-8 sm:p-12 text-center rounded-2xl shadow-sm border border-gray-100">
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
                                    className="bg-brand-dark text-white px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-black transition-colors cursor-pointer"
                                >
                                    {isArabic ? 'إعادة ضبط الخيارات' : 'Reset Filters'}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
                                {filteredProducts.map((product) => (
                                    <Link
                                        href={`/products/${product.id}`}
                                        key={product.id}
                                        className="bg-white p-3 sm:p-4 md:p-5 rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.1)] transition-all border border-gray-100/80 flex flex-col justify-between group relative block"
                                    >
                                        {/* Featured / On Sale Tag */}
                                        <div className="flex items-center gap-1 sm:gap-1.5 absolute top-4 left-4 z-10">
                                            <span className="text-[9px] sm:text-[10px] font-bold text-gray-500 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-sm shadow-2xs">
                                                {isArabic ? 'مميز' : 'Featured'}
                                            </span>
                                            {product.onSale && (
                                                <span className="bg-brand-yellow text-black text-[8px] sm:text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase shadow-2xs">
                                                    {isArabic ? 'تخفيض' : 'Sale'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Product Image Container */}
                                        <div className="w-full aspect-[4/3] bg-white rounded-xl flex items-center justify-center p-2.5 sm:p-4 my-2 sm:my-3 relative overflow-hidden">
                                            <img
                                                src={product.img}
                                                alt={product.title}
                                                loading="lazy"
                                                className="max-h-full max-w-full object-contain group-hover:scale-108 transition-transform duration-500 ease-out"
                                            />
                                        </div>

                                        {/* Product Info */}
                                        <div className="mt-auto flex flex-col justify-between flex-1">
                                            <div>
                                                <h4 className={`text-[11px] sm:text-[13px] font-bold text-black uppercase leading-snug tracking-wide line-clamp-2 min-h-[30px] sm:min-h-[36px] ${isArabic ? 'text-right dir-rtl font-sans' : 'text-left'}`}>
                                                    {isArabic ? (product.arabic || product.title) : product.title} <br/> <span className="text-gray-500 font-medium text-[10px] sm:text-[11px]">{product.size}</span>
                                                </h4>
                                                {isArabic ? (
                                                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 mb-2 sm:mb-3 font-medium text-right dir-ltr font-sans">{product.title}</p>
                                                ) : (
                                                    product.arabic && (
                                                        <p className="text-[10px] sm:text-xs text-gray-600 mt-0.5 sm:mt-1 mb-2 sm:mb-3 font-medium text-right dir-rtl font-sans">{product.arabic}</p>
                                                    )
                                                )}
                                            </div>

                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-gray-100 pt-2 sm:pt-3 mt-1">
                                                <div className="flex flex-col">
                                                    {isCorporateUser && product.corporatePrice ? (
                                                        <>
                                                            <span className="text-[9px] sm:text-[10px] font-medium text-gray-600 bg-gray-100 px-1 sm:px-1.5 py-0.5 rounded w-fit mb-0.5">
                                                                {isArabic ? 'سعر شركات' : 'Corporate'}
                                                            </span>
                                                            <div className="flex items-baseline gap-1 sm:gap-1.5">
                                                                <span className="font-bold text-[13px] sm:text-[15px] text-emerald-800">{formatPrice(product.corporatePrice)}</span>
                                                                <span className="text-[10px] sm:text-[11px] text-gray-400 line-through">{formatPrice(product.price)}</span>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <span className="font-bold text-[13px] sm:text-[15px] text-black">{formatPrice(product.price)}</span>
                                                    )}
                                                    {product.moq && product.moq > 1 && (
                                                        <span className="text-[9px] sm:text-[10px] font-bold text-amber-700">
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
                                                            catalogPrice: product.price,
                                                            corporatePrice: product.corporatePrice,
                                                            tieredPricing: product.tieredPricing,
                                                            image: product.img || '',
                                                            moq: product.moq,
                                                        });
                                                    }}
                                                    className="flex items-center justify-center gap-1 sm:gap-1.5 border border-gray-200 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 hover:bg-[#1a2b25] hover:text-white hover:border-[#1a2b25] transition-all group/btn cursor-pointer z-10 relative w-full sm:w-auto"
                                                >
                                                    <CartIcon size={12} className="text-gray-600 group-hover/btn:text-white transition-colors flex-shrink-0" />
                                                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 group-hover/btn:text-white transition-colors whitespace-nowrap">
                                                        {isArabic ? 'إضافة' : 'Add to cart'}
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
