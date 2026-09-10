"use client";

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-animated';
import { useShop } from '@/context/ShopContext';
import { translations } from '@/lib/translations';

export default function HeroSection() {
    const { language } = useShop();
    const isArabic = language.startsWith('Arabic');
    const t = isArabic ? translations.ar.hero : translations.en.hero;

    const videoRef = useRef<HTMLVideoElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const starburstRef = useRef<HTMLDivElement>(null);

    // 1. Smooth Autoplay across all browsers & devices, starting at 16 seconds
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const startAt16 = () => {
            if (video.currentTime < 16) {
                video.currentTime = 16;
            }
            video.play().catch(() => {
                video.muted = true;
                video.play().catch(() => {});
            });
        };

        if (video.readyState >= 1) {
            startAt16();
        } else {
            video.addEventListener('loadedmetadata', startAt16, { once: true });
        }
    }, []);

    // 2. High-performance, 60fps/120fps hardware-accelerated smooth parallax effect
    useEffect(() => {
        let ticking = false;

        const onScroll = () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const scrollY = window.scrollY;
                    const vh = window.innerHeight || 800;

                    // Only compute while hero is partially or fully visible
                    if (scrollY <= vh * 1.4) {
                        // Background video parallax: subtle vertical translation without artificial zoom
                        if (videoRef.current) {
                            videoRef.current.style.transform = `translate3d(0, ${scrollY * 0.22}px, 0)`;
                        }

                        // Brand Title parallax & fade: moves smoothly at 0.42x speed and fades out
                        if (contentRef.current) {
                            const fadeProgress = Math.min(scrollY / (vh * 0.75), 1);
                            contentRef.current.style.transform = `translate3d(0, ${scrollY * 0.42}px, 0)`;
                            contentRef.current.style.opacity = `${Math.max(0, 1 - fadeProgress * 1.2)}`;
                        }

                        // Signature gold starburst rotates gently with scroll motion
                        if (starburstRef.current) {
                            starburstRef.current.style.transform = `rotate(${scrollY * 0.12}deg)`;
                        }
                    }

                    ticking = false;
                });
                ticking = true;
            }
        };

        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return (
        <section className="relative w-full h-screen min-h-[100dvh] flex flex-col justify-end overflow-hidden select-none font-sans text-white px-5 sm:px-10 md:px-14 lg:px-16 pb-8 sm:pb-14 md:pb-20">

            {/* 1. SEAMLESS FULL-VIEWPORT 4K DRONE VIDEO BACKGROUND (NATURAL SCALE / NO ARTIFICIAL ZOOM) */}
            <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    poster="/images/hero_poster.jpg"
                    className="absolute inset-0 w-full h-full object-cover object-center will-change-transform"
                >
                    <source src="/videos/riyadh_drone_hero.mp4#t=16" type="video/mp4" />
                </video>

                {/* Subtle uniform tint for readability without harsh dark bars or vignettes */}
                <div className="absolute inset-0 bg-black/25" />
            </div>

            {/* 2. BOTTOM HERO BAR: LEFT BRAND TEXT & RIGHT EXPLORE PRODUCTS BUTTON */}
            <div
                ref={contentRef}
                className="relative z-10 w-full flex flex-col md:flex-row items-start md:items-end justify-between gap-5 sm:gap-6 will-change-transform"
            >
                {/* Left Bottom: Brand Title & Subtle One-Liner */}
                <div className="flex flex-col items-start text-left">
                    <div className="font-heading flex flex-col items-start justify-center">
                        <h1
                            className={`text-[23vw] sm:text-[90px] md:text-[110px] lg:text-[130px] font-normal uppercase text-white leading-[0.82] tracking-tight scale-y-110 transform origin-bottom drop-shadow-[0_12px_40px_rgba(0,0,0,0.95)] ${
                                isArabic ? 'font-sans font-black tracking-tight scale-y-100 text-[18vw] sm:text-[80px] lg:text-[100px]' : ''
                            }`}
                        >
                            {t.firstName}
                        </h1>

                        <div className="flex items-center justify-start gap-2.5 sm:gap-6">
                            <h1
                                className={`text-[23vw] sm:text-[90px] md:text-[110px] lg:text-[130px] font-normal uppercase text-white leading-[0.82] tracking-tight scale-y-110 transform origin-bottom relative drop-shadow-[0_12px_40px_rgba(0,0,0,0.95)] ${
                                    isArabic ? 'font-sans font-black tracking-tight scale-y-100 text-[18vw] sm:text-[80px] lg:text-[100px]' : ''
                                }`}
                            >
                                {t.lastName}
                            </h1>

                            {/* Signature Polished Gold Starburst */}
                            <div
                                ref={starburstRef}
                                className="text-amber-400 filter drop-shadow-[0_0_25px_rgba(251,191,36,0.7)] shrink-0 transition-transform duration-100 will-change-transform"
                            >
                                <svg
                                    className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16"
                                    viewBox="0 0 119 122"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M61 0L62.9615 56.2662L104.133 17.8667L65.7349 59.0396L122 61L65.7338 62.9615L104.133 104.133L62.9615 65.7349L61 122L59.0396 65.7338L17.8667 104.133L56.2651 62.9615L0 61L56.2662 59.0396L17.8667 17.8667L59.0396 56.2651L61 0Z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* Subtle One-Liner (Left-aligned, No Uppercase, Soft & Understated) */}
                    <p className="text-sm sm:text-base font-light tracking-wide text-white/80 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] mt-2.5 sm:mt-4 text-left max-w-lg">
                        {t.tagline}
                    </p>
                </div>

                {/* Right Bottom: Explore Products Button */}
                <div className="shrink-0 pt-2 sm:pt-0 pb-1 sm:pb-2">
                    <Link
                        href="/products"
                        className="group inline-flex items-center gap-2.5 bg-white text-[#0a1713] px-6 sm:px-8 py-3 sm:py-3.5 rounded-full text-xs sm:text-sm font-semibold hover:bg-emerald-400 hover:text-black transition-all shadow-[0_4px_24px_rgba(0,0,0,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] transform hover:-translate-y-0.5 backdrop-blur-xs"
                    >
                        <span>{isArabic ? 'استكشف المنتجات' : 'Explore Products'}</span>
                        <ArrowUpRightIcon
                            size={16}
                            className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                        />
                    </Link>
                </div>
            </div>

        </section>
    );
}