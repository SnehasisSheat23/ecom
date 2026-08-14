"use client";

import { useParams, useRouter } from 'next/navigation';
import { useShop } from '@/context/ShopContext';
import { ChevronLeft, Star, Plus, Minus, Share, Heart, ArrowUpRight, ChevronDown, FileText, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchProductBySlug, StorefrontProduct } from '@/lib/api';

export default function ProductDescriptionPage() {
    const params = useParams();
    const router = useRouter();
    const { addToCart, currency, formatPrice, toggleWishlist, isInWishlist, setIsWishlistOpen, language } = useShop();
    const productId = params.id as string;

    const isArabic = language.startsWith('Arabic') || language === 'ar' || language === 'العربية';

    const [isLoading, setIsLoading] = useState(true);
    const [product, setProduct] = useState<StorefrontProduct | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [openAccordions, setOpenAccordions] = useState<string[]>([
        isArabic ? 'تفاصيل المنتج' : 'Product details'
    ]);

    useEffect(() => {
        let isMounted = true;
        async function loadProduct() {
            if (!productId) return;
            try {
                const apiProd = await fetchProductBySlug(productId, currency, isArabic ? 'ar' : 'en');
                if (apiProd && isMounted) {
                    setProduct(apiProd);
                    setSelectedImage(null);
                    setQuantity(Math.max(1, apiProd.moq || 1));
                }
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        loadProduct();
        return () => { isMounted = false; };
    }, [productId, currency, isArabic]);

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

    const descriptionHtml = isArabic 
        ? (product.descriptionAr || product.specifications?.arabicDescription || product.specifications?.descAr || product.description || '') 
        : (product.descriptionEn || product.description || '');

    const hasArabicTitle = Boolean(
        product.arabic && 
        product.arabic.trim() && 
        product.arabic.trim().toLowerCase() !== product.title.trim().toLowerCase()
    );
    const hasEnglishSubtitle = Boolean(
        isArabic && 
        product.title && 
        product.title.trim().toLowerCase() !== (product.arabic || '').trim().toLowerCase()
    );

    const accordions = [
        { 
            id: isArabic ? 'تفاصيل المنتج' : 'Product details', 
            type: 'description',
        },
        { 
            id: isArabic ? 'المواصفات الفنية' : 'Technical Specifications', 
            type: 'specifications',
        },
        { 
            id: isArabic ? 'الشحن والتوصيل' : 'Shipping and delivery', 
            type: 'text',
            content: isArabic 
                ? 'نوفر شحن تبريد سريع ومباشر للمطاعم والفنادق والشركات في جميع مدن ومناطق المملكة العربية السعودية مع ضمان جودة التخزين والنقل.' 
                : 'We offer temperature-controlled standard and express refrigerated delivery to restaurants, hotels, and businesses across all regions of Saudi Arabia.' 
        },
        { 
            id: isArabic ? 'سياسة الإرجاع' : 'Returns', 
            type: 'text',
            content: isArabic 
                ? 'يُقبل استرجاع أو استبدال المنتجات التالفة خلال 14 يوماً من تاريخ الاستلام بشرط بقاء العبوة في حالتها الأصلية مع إرفاق الفاتورة.' 
                : 'Returns and replacements for damaged or incorrect goods are accepted within 14 days of receipt, provided items are unopened with the original receipt.' 
        }
    ];

    const toggleAccordion = (id: string) => {
        setOpenAccordions((prev) => 
            prev.includes(id) 
                ? prev.filter((item) => item !== id) 
                : [...prev, id]
        );
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
                {(() => {
                    const rawImages = (product.images && product.images.length > 0)
                        ? product.images
                        : (product.img ? [product.img] : []);
                    const primaryImg = rawImages[0] || product.img || 'https://placehold.co/600x600?text=No+Image';

                    // Slot 0 (Main featured view)
                    const mainDisplayImg = selectedImage || rawImages[0] || primaryImg;

                    // Slot 1, 2, 3: Use secondary images if available, otherwise reuse primary image
                    const slot1Img = rawImages[1] || primaryImg;
                    const slot2Img = rawImages[2] || primaryImg;
                    const slot3Img = rawImages[3] || primaryImg;

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                            {/* Main Image View */}
                            <div className="bg-[#eaf3f8] rounded-xl overflow-hidden aspect-[4/3] relative flex items-center justify-center p-8">
                                <div className="absolute inset-0 bg-gradient-to-b from-blue-300/30 to-transparent pointer-events-none"></div>
                                <img 
                                    src={mainDisplayImg} 
                                    alt={product.title} 
                                    className="w-full h-full object-contain z-10 hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                            
                            {/* Sub Images Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Sub Image 1 (Top Wide) */}
                                <div 
                                    onClick={() => setSelectedImage(slot1Img)}
                                    className="col-span-2 bg-[#f4ece3] rounded-xl overflow-hidden h-[240px] relative flex items-center justify-center p-4 cursor-pointer"
                                >
                                    <img src={slot1Img} alt={`${product.title} view 2`} className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" />
                                </div>

                                {/* Sub Image 2 (Bottom Left) */}
                                <div 
                                    onClick={() => setSelectedImage(slot2Img)}
                                    className="bg-[#eaf3f8] rounded-xl overflow-hidden h-[180px] flex items-center justify-center p-2 cursor-pointer"
                                >
                                    <img src={slot2Img} alt={`${product.title} view 3`} className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" />
                                </div>

                                {/* Sub Image 3 (Bottom Right) */}
                                <div 
                                    onClick={() => setSelectedImage(slot3Img)}
                                    className="bg-[#eaf3f8] rounded-xl overflow-hidden h-[180px] flex items-center justify-center p-2 cursor-pointer"
                                >
                                    <img src={slot3Img} alt={`${product.title} view 4`} className="w-full h-full object-contain hover:scale-105 transition-transform duration-300" />
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Product Details Section */}
                <div className="flex flex-col lg:flex-row gap-12">
                    
                    {/* Left Column - Info & Accordions */}
                    <div className="flex-1">
                        <div className={`mb-8 ${isArabic ? 'text-right' : 'text-left'}`}>
                            <h1 className="text-3xl md:text-5xl font-heading mb-2 inline-block transform scale-y-110 origin-bottom">
                                <span className="bg-[#fbdc3c] px-3 pt-2 pb-1 inline-block leading-none">
                                    {isArabic ? (product.arabic || product.title) : product.title}
                                </span>
                            </h1>
                            {isArabic ? (
                                hasEnglishSubtitle && (
                                    <p className="text-xl font-bold text-gray-500 mt-2 font-sans">
                                        {product.title}
                                    </p>
                                )
                            ) : (
                                hasArabicTitle && (
                                    <p className="text-2xl font-bold text-gray-700 mt-2 dir-rtl text-right font-sans">
                                        {product.arabic}
                                    </p>
                                )
                            )}
                        </div>
                        
                        {/* Accordions */}
                        <div className="border-t border-gray-200 divide-y divide-gray-100">
                            {accordions.map((acc) => {
                                const isOpen = openAccordions.includes(acc.id);
                                return (
                                    <div key={acc.id} className="py-2">
                                        <button 
                                            onClick={() => toggleAccordion(acc.id)}
                                            className={`w-full py-4 flex justify-between items-center text-left focus:outline-none group cursor-pointer ${isArabic ? 'flex-row-reverse text-right' : ''}`}
                                        >
                                            <span className={`font-bold text-base md:text-lg transition-colors ${isOpen ? 'text-[#1a2b25]' : 'text-gray-800 group-hover:text-gray-600'}`}>
                                                {acc.id}
                                            </span>
                                            <div className={`size-7 rounded-full flex items-center justify-center transition-colors ${isOpen ? 'bg-gray-100' : 'bg-transparent group-hover:bg-gray-50'}`}>
                                                <ChevronDown size={18} className={`text-gray-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                        </button>
                                        
                                        {isOpen && (
                                            <div className="pb-6 pt-1">
                                                {acc.type === 'description' && (
                                                    <div 
                                                        className={`prose prose-sm md:prose-base max-w-none text-gray-700 text-[15px] leading-relaxed font-sans ${isArabic ? 'dir-rtl text-right' : 'text-left'} [&_p]:mb-3 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_strong]:font-bold [&_strong]:text-gray-900 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-gray-900 [&_h3]:mb-2 [&_table]:w-full [&_table]:border [&_table]:border-gray-200 [&_table]:my-3 [&_th]:border [&_th]:border-gray-200 [&_th]:p-2 [&_th]:bg-gray-50 [&_th]:font-bold [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-emerald-600 [&_a]:underline`}
                                                        dangerouslySetInnerHTML={{
                                                            __html: descriptionHtml || (isArabic ? '<p>منتج عالي الجودة مُعد بأعلى معايير سلامة الأغذية للتزويد الفندقي والتجاري في المملكة.</p>' : '<p>High-quality food product prepared to the highest food safety standards for wholesale and commercial supply.</p>')
                                                        }}
                                                    />
                                                )}

                                                {acc.type === 'specifications' && (
                                                    <div className={`space-y-4 ${isArabic ? 'dir-rtl text-right' : 'text-left'}`}>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            <div className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                                                                <span className="text-[11px] text-gray-400 uppercase font-semibold block tracking-wider mb-1">
                                                                    {isArabic ? 'الماركة' : 'Brand'}
                                                                </span>
                                                                <span className="font-bold text-gray-900 text-sm">
                                                                    {isArabic 
                                                                        ? (product.specifications?.brandAr || product.specifications?.brand || 'شركة عبد الله بخيت للتجارة') 
                                                                        : (product.specifications?.brand || 'Abdullah Bakheet Trading')}
                                                                </span>
                                                            </div>
                                                            <div className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                                                                <span className="text-[11px] text-gray-400 uppercase font-semibold block tracking-wider mb-1">
                                                                    {isArabic ? 'الوزن الصافي / الحجم' : 'Net Weight / Pack Size'}
                                                                </span>
                                                                <span className="font-bold text-gray-900 text-sm">
                                                                    {isArabic 
                                                                        ? (product.specifications?.netWeightAr || product.specifications?.netWeight || product.size || 'حسب الطلب') 
                                                                        : (product.specifications?.netWeight || product.size || 'As requested')}
                                                                </span>
                                                            </div>
                                                            <div className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                                                                <span className="text-[11px] text-gray-400 uppercase font-semibold block tracking-wider mb-1">
                                                                    {isArabic ? 'الحد الأدنى للطلب (MOQ)' : 'Minimum Order (MOQ)'}
                                                                </span>
                                                                <span className="font-bold text-[#1a2b25] text-sm">
                                                                    {product.moq || 1} {isArabic ? 'وحدات' : 'Units'}
                                                                </span>
                                                            </div>
                                                            <div className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-2xs">
                                                                <span className="text-[11px] text-gray-400 uppercase font-semibold block tracking-wider mb-1">
                                                                    {isArabic ? 'بلد المنشأ' : 'Country of Origin'}
                                                                </span>
                                                                <span className="font-bold text-gray-900 text-sm">
                                                                    {isArabic 
                                                                        ? (product.specifications?.originAr || product.specifications?.origin || 'المملكة العربية السعودية') 
                                                                        : (product.specifications?.origin || 'Saudi Arabia')}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {(product.specifications?.mouqFile || product.specifications?.mouq_file) && (
                                                            <div className="pt-2">
                                                                <a
                                                                    href={product.specifications?.mouqFile || product.specifications?.mouq_file}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                                                                >
                                                                    <FileText size={14} />
                                                                    <span>{isArabic ? 'تحميل ملف المواصفات MOUQ' : 'Download MOUQ Specification File'}</span>
                                                                    <Download size={13} />
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {acc.type === 'text' && (
                                                    <p className={`text-gray-600 text-[14px] leading-relaxed ${isArabic ? 'text-right dir-rtl' : ''}`}>
                                                        {acc.content}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Column - Sticky Sidebar */}
                    <div className="w-full lg:w-[400px]">
                        <div className="bg-[#fafafa] p-8 rounded-xl sticky top-8 border border-gray-100">
                            
                            <div className="mb-6 inline-block">
                                <span className="bg-[#fbdc3c] px-3 pt-2 pb-1 inline-block text-3xl font-heading leading-none transform scale-y-110 origin-bottom">
                                    {formatPrice(product.price)}
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
                                    <div className="flex justify-between items-center mb-2">
                                        <label className={`text-xs font-medium text-gray-500 ${isArabic ? 'text-right' : 'text-left'}`}>
                                            {isArabic ? 'الكمية' : 'Quantity'}
                                        </label>
                                        {product.moq && product.moq > 1 && (
                                            <span className="text-[11px] text-amber-800 bg-amber-50 font-bold px-2 py-0.5 rounded border border-amber-200">
                                                {isArabic ? `الحد الأدنى: ${product.moq}` : `MOQ: ${product.moq}`}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between border border-gray-200 rounded-md p-1 bg-white">
                                        <button 
                                            onClick={() => setQuantity(Math.max(product.moq || 1, quantity - 1))}
                                            disabled={quantity <= (product.moq || 1)}
                                            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-50 rounded disabled:opacity-40"
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
                                        <span className="font-bold text-sm px-3 py-2">{product.size}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="space-y-3 mb-6">
                                <button 
                                    onClick={() => {
                                        addToCart({
                                            id: product.id,
                                            variantId: product.variantId,
                                            name: isArabic ? (product.arabic || product.title) : product.title,
                                            category: product.category,
                                            price: product.price,
                                            image: product.img || '',
                                            moq: product.moq,
                                            quantity,
                                        });
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
