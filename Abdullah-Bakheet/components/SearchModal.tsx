"use client";

import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import { SearchIcon, XIcon, ArrowUpRightIcon } from 'lucide-animated';
import Link from 'next/link';

export default function SearchModal() {
    const { isSearchOpen, setIsSearchOpen, language } = useShop();
    const [query, setQuery] = useState('');
    const isArabic = language.startsWith('Arabic');

    const sampleProducts = [
        { title: isArabic ? 'بطاطس مقلية' : 'French Fries', category: isArabic ? 'منتجات مجمدة' : 'Frozen Items', href: '/products' },
        { title: isArabic ? 'مخلل فطر عضوي' : 'Organic Mushroom Pickles', category: isArabic ? 'مخللات' : 'Pickles', href: '/products' },
        { title: isArabic ? 'خردل نيستول فاخر' : 'Nestol Premium Mustard', category: isArabic ? 'صلصات وتتبيلات' : 'Sauces & Dressings', href: '/products' },
        { title: isArabic ? 'كاتشب طماطم' : 'Tomato Ketchup', category: isArabic ? 'كاتشب' : 'Ketchup', href: '/products' },
        { title: isArabic ? 'خل أبيض نقي' : 'Pure White Vinegar', category: isArabic ? 'خل' : 'Vinegar', href: '/products' },
        { title: isArabic ? 'مخلل خضروات مشكلة' : 'Mixed Vegetable Pickles', category: isArabic ? 'مخللات' : 'Pickles', href: '/products' },
    ];

    if (!isSearchOpen) return null;

    const filteredProducts = query.trim() === '' 
        ? sampleProducts.slice(0, 4)
        : sampleProducts.filter(p => p.title.toLowerCase().includes(query.toLowerCase()) || p.category.toLowerCase().includes(query.toLowerCase()));

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20 flex justify-center items-start">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
                onClick={() => setIsSearchOpen(false)} 
            />

            {/* Modal Box */}
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden z-10 border border-gray-100">
                {/* Search Input Bar */}
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center gap-3">
                    <SearchIcon size={20} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder={isArabic ? 'البحث عن المنتجات والأقسام...' : 'Search for products, categories...'}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        autoFocus
                        className={`w-full text-base sm:text-lg outline-none text-gray-900 placeholder:text-gray-400 font-sans ${isArabic ? 'text-right' : 'text-left'}`}
                    />
                    <button 
                        onClick={() => setIsSearchOpen(false)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <XIcon size={20} />
                    </button>
                </div>

                {/* Search Results / Suggestions */}
                <div className="p-5 max-h-[60vh] overflow-y-auto">
                    <div className="mb-3 flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                        <span>{query.trim() === '' ? (isArabic ? 'الاقتراحات الشائعة' : 'Popular Suggestions') : (isArabic ? 'نتائج البحث' : 'Search Results')}</span>
                        <span>{filteredProducts.length} {isArabic ? 'عنصر' : 'items'}</span>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {filteredProducts.length > 0 ? (
                            filteredProducts.map((item, idx) => (
                                <Link
                                    key={idx}
                                    href={item.href}
                                    onClick={() => setIsSearchOpen(false)}
                                    className="py-3 px-2 flex items-center justify-between hover:bg-gray-50 rounded-lg transition-colors group"
                                >
                                    <div className={isArabic ? 'text-right' : 'text-left'}>
                                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-brand-dark transition-colors">
                                            {item.title}
                                        </h4>
                                        <span className="text-xs text-gray-500">{item.category}</span>
                                    </div>
                                    <div className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center group-hover:bg-brand-dark group-hover:text-white transition-colors">
                                        <ArrowUpRightIcon size={14} />
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="py-8 text-center text-gray-500 text-sm">
                                {isArabic ? `لم يتم العثور على منتجات تطابق "${query}"` : `No products found matching "${query}"`}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

