"use client";

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const DARK  = '#0d1a15';
const LIGHT = '#f5f1ea';
const GOLD  = '#fbdc3c';
const FONT  = 'clamp(2.5rem, 11.5vw, 11rem)';

export default function IntroAnimation({ onComplete }: { onComplete: () => void }) {
    const containerRef      = useRef<HTMLDivElement>(null);
    const topPanelRef       = useRef<HTMLDivElement>(null);
    const bottomPanelRef    = useRef<HTMLDivElement>(null);
    const lineLeftRef       = useRef<HTMLDivElement>(null);
    const lineRightRef      = useRef<HTMLDivElement>(null);
    const logoRef           = useRef<HTMLDivElement>(null);
    const subtitleRef       = useRef<HTMLParagraphElement>(null);
    const counterRef        = useRef<HTMLDivElement>(null);
    const countNumRef       = useRef<HTMLSpanElement>(null);
    const barRef            = useRef<HTMLDivElement>(null);

    const aRefs = useRef<HTMLSpanElement[]>([]);
    const bRefs = useRef<HTMLSpanElement[]>([]);
    const onCompleteRef = useRef(onComplete);
    onCompleteRef.current = onComplete;
    const hasCompleted = useRef(false);

    const W1 = 'ABDULLAH';
    const W2 = 'BAKHEET';

    useEffect(() => {
        aRefs.current = aRefs.current.slice(0, W1.length);
        bRefs.current = bRefs.current.slice(0, W2.length);

        const ctx = gsap.context(() => {
            // ── INITIAL STATE ────────────────────────────────────────────────
            gsap.set(containerRef.current, { opacity: 1 });

            // Force letter colours via GSAP
            gsap.set(aRefs.current, { color: LIGHT, y: '105%' });
            gsap.set(bRefs.current, { color: LIGHT, y: '-105%' });

            gsap.set(logoRef.current,     { opacity: 0, y: -15, filter: 'blur(4px)', color: LIGHT });
            gsap.set(subtitleRef.current, { opacity: 0, letterSpacing: '0.45em', color: `${LIGHT}66` });
            gsap.set(counterRef.current,  { opacity: 0, y: 6, color: LIGHT });

            gsap.set(lineLeftRef.current,  { scaleX: 0, transformOrigin: 'right center' });
            gsap.set(lineRightRef.current, { scaleX: 0, transformOrigin: 'left center' });
            gsap.set(barRef.current,       { scaleX: 0, transformOrigin: 'left center' });

            // ── TIMELINE (Silky Smooth Luxury Pacing ~2.3s) ───────────────────
            const tl = gsap.timeline({
                onComplete: () => {
                    if (!hasCompleted.current) {
                        hasCompleted.current = true;
                        onCompleteRef.current?.();
                    }
                }
            });

            // 1. Stage lines draw outward gracefully
            tl.to([lineLeftRef.current, lineRightRef.current], {
                scaleX: 1, duration: 0.5, ease: 'power2.inOut'
            }, 0.05);

            // 2. Logo reveals
            tl.to(logoRef.current, {
                opacity: 1, y: 0, filter: 'blur(0px)',
                duration: 0.6, ease: 'power3.out',
            }, 0.15);

            // 3. Letters reveal with elegant stagger
            tl.to(aRefs.current, {
                y: '0%', duration: 0.85,
                stagger: { each: 0.035, from: 'start' },
                ease: 'power4.out',
            }, 0.25);

            tl.to(bRefs.current, {
                y: '0%', duration: 0.85,
                stagger: { each: 0.035, from: 'start' },
                ease: 'power4.out',
            }, 0.35);

            // 4. Subtitle & counter reveal
            tl.to(subtitleRef.current, {
                opacity: 1, letterSpacing: '0.26em',
                duration: 0.7, ease: 'power2.out',
            }, 0.55);

            tl.to(counterRef.current, {
                opacity: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)',
            }, 0.65);

            // 5. Counter 0→100% + golden progress bar (smooth 1.05s)
            const obj = { val: 0 };
            tl.to(obj, {
                val: 100, duration: 1.05, ease: 'power1.inOut',
                onUpdate() {
                    if (countNumRef.current)
                        countNumRef.current.textContent = String(Math.round(obj.val));
                },
            }, 0.75);
            tl.to(barRef.current, { scaleX: 1, duration: 1.05, ease: 'power1.inOut' }, 0.75);

            // 6. Smooth Split Curtain Exit
            tl.to(topPanelRef.current,    { yPercent: -100, duration: 0.85, ease: 'expo.inOut' }, 1.85);
            tl.to(bottomPanelRef.current, { yPercent: 100,  duration: 0.85, ease: 'expo.inOut' }, 1.85);

            // 7. Container fade
            tl.to(containerRef.current, { opacity: 0, duration: 0.25, ease: 'power2.in' }, 2.35);

        }, containerRef);

        return () => ctx.revert();
    }, []);

    // Shared styles
    const grainStyle: React.CSSProperties = {
        position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none',
        opacity: 0.055, mixBlendMode: 'overlay',
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: '160px 160px',
    };

    const panelBase: React.CSSProperties = {
        position: 'absolute', left: 0, right: 0, height: '50%',
        overflow: 'hidden', zIndex: 10,
        backgroundColor: DARK,
        backgroundImage: `radial-gradient(ellipse at 50% 50%, #1d3326 0%, ${DARK} 70%)`,
    };

    const letterStyle: React.CSSProperties = {
        display: 'inline-block',
        fontFamily: 'Fiorello',
        fontSize: FONT, fontWeight: 900,
        lineHeight: 0.85, letterSpacing: '0.11em',
        color: LIGHT, willChange: 'transform',
        textTransform: 'uppercase', userSelect: 'none',
    };

    const wrapStyle: React.CSSProperties = {
        display: 'inline-block', overflow: 'hidden', lineHeight: 0.85,
    };

    return (
        <div
            ref={containerRef}
            aria-hidden
            style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden', opacity: 0 }}
        >
            {/* ── TOP PANEL ── */}
            <div ref={topPanelRef} style={{ ...panelBase, top: 0 }}>
                <div aria-hidden style={grainStyle} />

                {/* Logo */}
                <div ref={logoRef} style={{
                    position: 'absolute', top: 24, left: 0, right: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    color: LIGHT, zIndex: 20, userSelect: 'none',
                }}>
                    <div style={{ fontFamily: 'Georgia,serif', fontSize: '2.2rem', fontWeight: 900, display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontStyle: 'italic' }}>A</span>
                        <span style={{ fontSize: '0.7rem', opacity: 0.45, fontFamily: 'sans-serif', letterSpacing: '0.1em' }}>✦</span>
                        <span style={{ fontStyle: 'italic' }}>B</span>
                    </div>
                    <span style={{ fontSize: '6.5px', letterSpacing: '0.44em', textTransform: 'uppercase', opacity: 0.55, marginTop: 2 }}>Abdullah Bakheet</span>
                    <span style={{ fontSize: '5px', letterSpacing: '0.5em', textTransform: 'uppercase', opacity: 0.3 }}>Trading Company</span>
                </div>

                {/* Horizontal stage lines */}
                <div ref={lineLeftRef}  style={{ position: 'absolute', top: '100%', right: '50%', width: '50%', height: '1px', zIndex: 15, backgroundColor: `${LIGHT}30` }} />
                <div ref={lineRightRef} style={{ position: 'absolute', top: '100%', left: '50%',  width: '50%', height: '1px', zIndex: 15, backgroundColor: `${LIGHT}30` }} />

                {/* ABDULLAH */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', zIndex: 20 }}>
                    {W1.split('').map((ch, i) => (
                        <span key={i} style={wrapStyle}>
                            <span ref={el => { if (el) aRefs.current[i] = el; }} style={letterStyle}>{ch}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* ── BOTTOM PANEL ── */}
            <div ref={bottomPanelRef} style={{ ...panelBase, bottom: 0 }}>
                <div aria-hidden style={grainStyle} />

                {/* BAKHEET */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', zIndex: 20 }}>
                    {W2.split('').map((ch, i) => (
                        <span key={i} style={wrapStyle}>
                            <span ref={el => { if (el) bRefs.current[i] = el; }} style={{ ...letterStyle, lineHeight: 0.82 }}>{ch}</span>
                        </span>
                    ))}
                </div>

                {/* Subtitle */}
                <p ref={subtitleRef} style={{
                    position: 'absolute', bottom: 86, left: 0, right: 0, margin: 0,
                    textAlign: 'center', fontSize: 'clamp(7px,1vw,11px)',
                    textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.55em',
                    color: `${LIGHT}66`, userSelect: 'none', zIndex: 20,
                }}>
                    Best Fast Moving Consumer Goods in Saudi Arabia, Riyadh
                </p>

                {/* Counter */}
                <div ref={counterRef} style={{
                    position: 'absolute', bottom: 28, left: 0, right: 0,
                    display: 'flex', justifyContent: 'center', alignItems: 'baseline',
                    gap: 4, color: LIGHT, userSelect: 'none', zIndex: 20,
                }}>
                    <span ref={countNumRef} style={{ fontFamily: 'Fiorello', fontSize: 'clamp(2rem,5.5vw,4.2rem)', fontWeight: 900, lineHeight: 1 }}>0</span>
                    <span style={{ fontFamily: 'Fiorello', fontSize: 'clamp(1.2rem,3vw,2.6rem)', fontWeight: 700, lineHeight: 1, opacity: 0.65 }}>%</span>
                </div>

                {/* Progress bar */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: 'rgba(255,255,255,0.07)', zIndex: 20 }}>
                    <div ref={barRef} style={{
                        height: '100%', willChange: 'transform',
                        background: `linear-gradient(90deg, ${GOLD} 0%, #ffe566 100%)`,
                        boxShadow: `0 0 10px ${GOLD}88`,
                    }} />
                </div>
            </div>
        </div>
    );
}
