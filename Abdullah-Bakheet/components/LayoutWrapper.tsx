"use client";

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import SearchModal from '@/components/SearchModal';
import IntroAnimation from '@/components/IntroAnimation';
import { useShop } from '@/context/ShopContext';

const INTRO_SEEN_KEY = 'ab_intro_seen';

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/register';
    const contentRef = useRef<HTMLDivElement>(null);
    const { language } = useShop();

    // Sync HTML document language attribute (keeping layout LTR so elements do not flip/mirror)
    useEffect(() => {
        const isArabic = language.startsWith('Arabic');
        document.documentElement.lang = isArabic ? 'ar' : 'en';
        document.documentElement.dir = 'ltr';
    }, [language]);

    // showIntro: whether the intro overlay is mounted
    const [showIntro, setShowIntro] = useState(false);
    // contentReady: whether React should stop hiding the content div
    const [contentReady, setContentReady] = useState(false);

    useEffect(() => {
        if (isAuthPage) {
            setContentReady(true);
            return;
        }
        const seen = sessionStorage.getItem(INTRO_SEEN_KEY);
        if (seen) {
            // Already seen — show immediately, no intro
            setContentReady(true);
        } else {
            // First visit — hide content, play intro
            document.body.style.overflow = 'hidden';
            setShowIntro(true);
        }
    }, [isAuthPage]);

    const handleIntroComplete = () => {
        sessionStorage.setItem(INTRO_SEEN_KEY, '1');
        document.body.style.overflow = '';

        // 1. Unmount the intro overlay immediately
        setShowIntro(false);

        // 2. Mark content ready so React removes the opacity:0 style,
        //    then let GSAP own the fade-in from there.
        //    Double RAF ensures React has committed its re-render to the DOM
        //    before GSAP reads element state.
        setContentReady(true);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                gsap.fromTo(
                    contentRef.current,
                    { opacity: 0 },
                    { opacity: 1, duration: 0.9, ease: 'power3.out' }
                );
            });
        });
    };

    if (isAuthPage) {
        return (
            <main className="flex-1 w-full flex flex-col">
                {children}
            </main>
        );
    }

    return (
        <>
            {showIntro && <IntroAnimation onComplete={handleIntroComplete} />}

            {/*
             * While intro is playing: React hides via opacity:0.
             * Once contentReady=true: React removes the style entirely,
             * and GSAP takes over the reveal — no style conflicts.
             */}
            <div
                ref={contentRef}
                className="flex flex-col min-h-screen"
                style={contentReady ? undefined : { opacity: 0, pointerEvents: 'none' }}
            >
                <Header />
                <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col bg-brand-gray">
                    {children}
                </main>
                <Footer />
                <SearchModal />
            </div>
        </>
    );
}

