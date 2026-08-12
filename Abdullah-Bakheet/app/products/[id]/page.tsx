"use client";

import { useParams, useRouter } from 'next/navigation';
import { ALL_PRODUCTS } from '@/lib/data';
import { useShop } from '@/context/ShopContext';
import { ChevronLeft, Star, Plus, Minus, Share, Heart, ArrowUpRight, ChevronDown, FileText, Download } from 'lucide-react';
import { useState } from 'react';

import { useEffect } from 'react';
import { fetchProductBySlug, fetchProducts, StorefrontProduct } from '@/lib/api';

export default function ProductDescriptionPage() {
    const params = useParams();
    const router = useRouter();
    const { addToCart, currency, toggleWishlist, isInWishlist, setIsWishlistOpen, language } = useShop();
    const productId = params.id as string;

    const isArabic = language.startsWith('Arabic') || language === 'ar' || language === 'العربية';

    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState<StorefrontProduct | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [openAccordion, setOpenAccordion] = useState<string | null>(isArabic ? 'تفاصيل المنتج' : 'Product details');

    useEffect(() => {
        let isMounted = true;
        async function loadProduct() {
            if (!productId) return;
            try {
                const apiProd = await fetchProductBySlug(productId, 60);
                if (apiProd && isMounted) {
                    setProduct(apiProd);
                } else if (isMounted) {
                    const allProds = await fetchProducts(60);
                    const match = allProds.find(p => p.id === productId || p.slug === productId);
                    if (match && isMounted) {
                        setProduct(match);
                    }
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        loadProduct();
        return () => { isMounted = false; };
    }, [productId]);

    if (isLoading && !product) {
        return (
            <div className="w-full bg-brand-gray min-h-screen font-sans pb-24 animate-pulse">
                <div className="max-w-[1300px] mx-auto px-4 md:px-8 pt-8">
                    <div className="w-24 h-9 bg-gray-200/80 rounded-full mb-8" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                        <div className="bg-gray-200/80 rounded-xl aspect-[4/3]" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 bg-gray-200/80 rounded-xl h-[240px]" />
                            <div className="bg-gray-200/80 rounded-xl h-[180px]" />
                            <div className="bg-gray-200/80 rounded-xl h-[180px]" />
                        </div>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-12">
                        <div className="flex-1 space-y-4">
                            <div className="w-3/4 h-12 bg-gray-200/80 rounded-md" />
                            <div className="w-full h-24 bg-gray-200/80 rounded-md" />
                        </div>
                        <div className="w-full lg:w-[400px] h-64 bg-gray-200/80 rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold mb-4">{isArabic ? 'المنتج غير موجود' : 'Product not found'}</h1>
                <button onClick={() => router.back()} className="px-6 py-2 bg-black text-white rounded-md">
                    {isArabic ? 'الرجوع' : 'Go Back'}
                </button>
            </div>
        );
    }

    const accordions = [
        { 
            id: isArabic ? 'تفاصيل المنتج' : 'Product details', 
            content: isArabic 
                ? 'منتج عالي الجودة مُعد بأعلى معايير سلامة الأغذية للتزويد الفندقي والتجاري في المملكة.' 
                : 'Here you can find detailed information about the ingredients, sourcing, and nutritional value of this product.' 
        },
        { 
            id: isArabic ? 'الشحن والتوصيل' : 'Shipping and delivery', 
            content: isArabic 
                ? 'نوفر شحن تبريد سريع ومباشر للمطاعم والفنادق في جميع مدن المملكة العربية السعودية.' 
                : 'We offer standard and express delivery options. Free shipping on orders over 500 ر.س.' 
        },
        { 
            id: isArabic ? 'سياسة الإرجاع' : 'Returns', 
            content: isArabic 
                ? 'يُقبل الإرجاع خلال 14 يوماً من الاستلام بشرط عدم فتح العبوة وتوفر الفاتورة.' 
                : 'Returns are accepted within 14 days of purchase, provided the packaging is unopened.' 
        }
    ];

    const toggleAccordion = (id: string) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    return (
        <div className="w-full bg-brand-gray min-h-screen font-sans pb-24">
            <div className="max-w-[1300px] mx-auto px-4 md:px-8 pt-8">
                
                {/* Back Button */}
                <button 
                    onClick={() => router.back()}
                    className={`flex items-center gap-2 border border-gray-200 rounded-full px-5 py-2 mb-8 hover:bg-gray-50 transition-colors ${isArabic ? 'flex-row-reverse' : ''}`}
                >
                    <ChevronLeft size={16} className={isArabic ? 'rotate-180' : ''} />
                    <span className="font-bold text-sm">{isArabic ? 'رجوع' : 'Back'}</span>
                </button>

                {/* Gallery Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    {/* Main Image */}
                    <div className="bg-[#eaf3f8] rounded-xl overflow-hidden aspect-[4/3] relative flex items-center justify-center p-8">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-300/30 to-transparent pointer-events-none"></div>
                        <img 
                            src={product.img} 
                            alt={product.title} 
                            className="w-full h-full object-contain z-10 hover:scale-105 transition-transform duration-300"
                        />
                    </div>
                    
                    {/* Sub Images Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 bg-[#f4ece3] rounded-xl overflow-hidden h-[240px] relative flex items-center justify-center p-4">
                            <img src={product.img} alt={product.title} className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="bg-[#eaf3f8] rounded-xl overflow-hidden h-[180px] flex items-center justify-center p-2">
                            <img src={product.img} alt={product.title} className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" />
                        </div>
                        <div className="bg-[#eaf3f8] rounded-xl overflow-hidden h-[180px] flex items-center justify-center p-2">
                            <img src={product.img} alt={product.title} className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" />
                        </div>
                    </div>
                </div>

                {/* Product Details Section */}
                <div className="flex flex-col lg:flex-row gap-12">
                    
                    {/* Left Column - Info & Accordions */}
                    <div className="flex-1">
                        <div className={`mb-6 ${isArabic ? 'text-right' : 'text-left'}`}>
                            <h1 className="text-3xl md:text-5xl font-heading mb-2 inline-block transform scale-y-110 origin-bottom">
                                <span className="bg-[#fbdc3c] px-3 pt-2 pb-1 inline-block leading-none">
                                    {isArabic ? (product.arabic || product.title) : product.title}
                                </span>
                            </h1>
                            {isArabic ? (
                                <p className="text-xl font-bold text-gray-500 mt-2 font-sans">
                                    {product.title}
                                </p>
                            ) : (
                                product.arabic && (
                                    <p className="text-2xl font-bold text-gray-700 mt-2 dir-rtl text-right font-sans">
                                        {product.arabic}
                                    </p>
                                )
                            )}
                        </div>
                        
                        {/* Single Clean Description according to Language */}
                        <div className={`space-y-4 mb-8 bg-white p-6 rounded-xl border border-gray-100 shadow-sm ${isArabic ? 'text-right dir-rtl' : 'text-left'}`}>
                            <h3 className="font-bold text-gray-900 text-lg border-b border-gray-100 pb-2">
                                {isArabic ? 'وصف المنتج' : 'Product Description'}
                            </h3>
                            <p className="text-gray-700 text-[15px] leading-relaxed font-sans">
                                {isArabic 
                                    ? (product.descriptionAr || product.specifications?.arabicDescription || product.specifications?.descAr || product.description) 
                                    : (product.descriptionEn || product.description)}
                            </p>
                        </div>
                        
                        {/* Detailed Specifications Table */}
                        <div className={`mb-10 bg-white p-6 rounded-xl border border-gray-100 shadow-sm ${isArabic ? 'text-right dir-rtl' : 'text-left'}`}>
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                                <h3 className="font-bold text-gray-900 text-lg">
                                    {isArabic ? 'المواصفات الفنية' : 'Technical Specifications'}
                                </h3>
                                {(product.specifications?.mouqFile || product.specifications?.mouq_file) && (
                                    <a
                                        href={product.specifications?.mouqFile || product.specifications?.mouq_file}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                                    >
                                        <FileText size={14} />
                                        <span>{isArabic ? 'تحميل ملف المواصفات MOUQ' : 'Download MOUQ File'}</span>
                                        <Download size={13} />
                                    </a>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <span className="text-xs text-gray-400 uppercase font-semibold block">
                                        {isArabic ? 'الماركة' : 'Brand'}
                                    </span>
                                    <span className="font-bold text-gray-900 text-sm">
                                        {isArabic 
                                            ? (product.specifications?.brandAr || product.specifications?.brand || 'شركة عبد الله بخيت للتجارة') 
                                            : (product.specifications?.brand || 'Abdullah Bakheet Trading')}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <span className="text-xs text-gray-400 uppercase font-semibold block">
                                        {isArabic ? 'الوزن الصافي / الحجم' : 'Net Weight / Pack Size'}
                                    </span>
                                    <span className="font-bold text-gray-900 text-sm">
                                        {isArabic 
                                            ? (product.specifications?.netWeightAr || product.specifications?.netWeight || product.size) 
                                            : (product.specifications?.netWeight || product.size)}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <span className="text-xs text-gray-400 uppercase font-semibold block">
                                        {isArabic ? 'بلد المنشأ' : 'Country of Origin'}
                                    </span>
                                    <span className="font-bold text-gray-900 text-sm">
                                        {isArabic 
                                            ? (product.specifications?.originAr || product.specifications?.origin || 'المملكة العربية السعودية') 
                                            : (product.specifications?.origin || 'Saudi Arabia')}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <span className="text-xs text-gray-400 uppercase font-semibold block">
                                        {isArabic ? 'مدة الصلاحية' : 'Shelf Life'}
                                    </span>
                                    <span className="font-bold text-gray-900 text-sm">
                                        {isArabic 
                                            ? (product.specifications?.shelfLifeAr || product.specifications?.shelfLife || '12 شهراً') 
                                            : (product.specifications?.shelfLife || '12 Months')}
                                    </span>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg col-span-1 md:col-span-2">
                                    <span className="text-xs text-gray-400 uppercase font-semibold block">
                                        {isArabic ? 'شروط التخزين' : 'Storage Instructions'}
                                    </span>
                                    <span className="font-medium text-gray-800 text-sm">
                                        {isArabic 
                                            ? (product.specifications?.storageAr || product.specifications?.storage || 'يحفظ في مكان بارد وجاف') 
                                            : (product.specifications?.storage || 'Store in a cool dry place')}
                                    </span>
                                </div>
                                {(product.specifications?.certifications || product.specifications?.certificationsAr) && (
                                    <div className="p-3 bg-gray-50 rounded-lg col-span-1 md:col-span-2">
                                        <span className="text-xs text-gray-400 uppercase font-semibold block">
                                            {isArabic ? 'الشهادات والتراخيص' : 'Certifications'}
                                        </span>
                                        <span className="font-medium text-gray-800 text-sm">
                                            {isArabic 
                                                ? (product.specifications?.certificationsAr || product.specifications?.certifications) 
                                                : product.specifications?.certifications}
                                        </span>
                                    </div>
                                )}

                                {/* Render Custom Specifications if any */}
                                {product.specifications && Object.entries(product.specifications)
                                    .filter(([k]) => ![
                                        'mouqFile', 'mouq_file', 'brand', 'brandAr', 'netWeight', 'netWeightAr',
                                        'packSize', 'origin', 'originAr', 'shelfLife', 'shelfLifeAr', 'storage',
                                        'storageAr', 'certifications', 'certificationsAr', 'arabicName',
                                        'descriptionArabic', 'descAr', 'img', 'price'
                                    ].includes(k))
                                    .map(([k, v]) => (
                                        <div key={k} className="p-3 bg-gray-50 rounded-lg">
                                            <span className="text-xs text-gray-400 uppercase font-semibold block">
                                                {k}
                                            </span>
                                            <span className="font-bold text-gray-900 text-sm">
                                                {String(v)}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                        
                        {/* Accordions */}
                        <div className="border-t border-gray-100">
                            {accordions.map((acc) => (
                                <div key={acc.id} className="border-b border-gray-100">
                                    <button 
                                        onClick={() => toggleAccordion(acc.id)}
                                        className={`w-full py-5 flex justify-between items-center text-left focus:outline-none group ${isArabic ? 'flex-row-reverse text-right' : ''}`}
                                    >
                                        <span className="font-bold text-[15px] group-hover:text-gray-600 transition-colors">{acc.id}</span>
                                        <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${openAccordion === acc.id ? 'rotate-180' : ''}`} />
                                    </button>
                                    <div 
                                        className={`overflow-hidden transition-all duration-300 ${openAccordion === acc.id ? 'max-h-40 pb-5 opacity-100' : 'max-h-0 opacity-0'}`}
                                    >
                                        <p className={`text-gray-500 text-[14px] ${isArabic ? 'text-right dir-rtl' : ''}`}>{acc.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Sticky Sidebar */}
                    <div className="w-full lg:w-[400px]">
                        <div className="bg-[#fafafa] p-8 rounded-xl sticky top-8 border border-gray-100">
                            
                            <div className="mb-6 inline-block">
                                <span className="bg-[#fbdc3c] px-3 pt-2 pb-1 inline-block text-3xl font-heading leading-none transform scale-y-110 origin-bottom">
                                    {currency} {product.price}
                                </span>
                            </div>
                            
                            <div className={`flex items-center gap-4 mb-8 ${isArabic ? 'flex-row-reverse' : ''}`}>
                                <span className="text-sm font-bold border-r border-gray-300 pr-4">50 {isArabic ? 'تقييم' : 'reviews'}</span>
                                <div className="flex text-[#fbdc3c]">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={16} fill="currentColor" />
                                    ))}
                                </div>
                            </div>
                            
                            <div className="space-y-6 mb-8">
                                <div>
                                    <label className={`block text-xs font-medium text-gray-500 mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                                        {isArabic ? 'الكمية' : 'Quantity'}
                                    </label>
                                    <div className="flex items-center justify-between border border-gray-200 rounded-md p-1 bg-white">
                                        <button 
                                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded"
                                        >
                                            <Minus size={16} />
                                        </button>
                                        <span className="font-bold text-sm">{quantity}</span>
                                        <button 
                                            onClick={() => setQuantity(quantity + 1)}
                                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className={`block text-xs font-medium text-gray-500 mb-2 ${isArabic ? 'text-right' : 'text-left'}`}>
                                        {isArabic ? 'الوزن / الحجم' : 'Weight / Size'}
                                    </label>
                                    <div className="flex items-center justify-between border border-gray-200 rounded-md p-1 bg-white">
                                        <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded disabled:opacity-50">
                                            <Minus size={16} />
                                        </button>
                                        <span className="font-bold text-sm">{product.size}</span>
                                        <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded disabled:opacity-50">
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                                <button 
                                    onClick={() => {
                                        for(let i=0; i<quantity; i++) {
                                            addToCart({
                                                id: product.id,
                                                name: isArabic ? (product.arabic || product.title) : product.title,
                                                category: product.category,
                                                price: product.price,
                                                image: product.img || ''
                                            });
                                        }
                                        router.push('/cart');
                                    }}
                                    className="w-full bg-[#1a2b25] text-white py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:bg-black transition-colors group"
                                >
                                    {isArabic ? 'شراء الآن' : 'BUY NOW'}
                                    <ArrowUpRight size={16} className={`text-gray-400 group-hover:text-white transition-colors ${isArabic ? 'rotate-180' : ''}`} />
                                </button>
                                <button 
                                    onClick={() => {
                                        toggleWishlist({
                                            id: product.id,
                                            name: isArabic ? (product.arabic || product.title) : product.title,
                                            category: product.category,
                                            price: product.price,
                                            image: product.img || ''
                                        });
                                        setIsWishlistOpen(true);
                                    }}
                                    className="w-full bg-white text-black border border-gray-200 py-4 rounded-md font-bold text-[13px] uppercase tracking-wide flex justify-center items-center gap-2 hover:border-[#1a2b25] transition-colors group"
                                >
                                    {isInWishlist(product.id) 
                                        ? (isArabic ? 'إزالة من المفضلة' : 'REMOVE FROM WISHLIST') 
                                        : (isArabic ? 'إضافة إلى المفضلة' : 'ADD TO WISHLIST')}
                                    <ArrowUpRight size={16} className={`text-gray-400 group-hover:text-black transition-colors ${isArabic ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                            
                            <div className="flex justify-center items-center gap-4">
                                <button className="w-12 h-12 flex items-center justify-center border border-gray-200 rounded-lg hover:border-gray-400 transition-colors text-gray-500 hover:text-black">
                                    <Share size={18} />
                                </button>
                                <button 
                                    onClick={() => {
                                        toggleWishlist({
                                            id: product.id,
                                            name: product.title,
                                            category: product.category,
                                            price: product.price,
                                            image: product.img || ''
                                        });
                                    }}
                                    className={`w-12 h-12 flex items-center justify-center border rounded-lg transition-colors ${isInWishlist(product.id) ? 'border-red-200 text-red-500 bg-red-50' : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500 hover:bg-red-50'}`}
                                >
                                    <Heart size={18} fill={isInWishlist(product.id) ? 'currentColor' : 'none'} />
                                </button>
                            </div>
                            
                        </div>
                    </div>
                    
                </div>
            </div>
        </div>
    );
}
