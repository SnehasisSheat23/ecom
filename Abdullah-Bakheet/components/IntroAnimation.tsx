"use client";

import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

const DARK  = '#0d1a15';
const LIGHT = '#f5f1ea';
const GOLD  = '#fbdc3c';
const FONT  = 'clamp(4rem, 13vw, 13rem)';

export default function IntroAnimation({ onComplete }: { onComplete: () => void }) {
    const containerRef      = useRef<HTMLDivElement>(null);
    const topPanelRef       = useRef<HTMLDivElement>(null);
    const bottomPanelRef    = useRef<HTMLDivElement>(null);
    // Colour-swap overlays — one inside each panel, fade from 0→1 at 50%
    const topOverlayRef     = useRef<HTMLDivElement>(null);
    const bottomOverlayRef  = useRef<HTMLDivElement>(null);
    const lineLeftRef       = useRef<HTMLDivElement>(null);
    const lineRightRef      = useRef<HTMLDivElement>(null);
    const lineVRef          = useRef<HTMLDivElement>(null);
    const logoRef           = useRef<HTMLDivElement>(null);
    const subtitleRef       = useRef<HTMLParagraphElement>(null);
    const counterRef        = useRef<HTMLDivElement>(null);
    const countNumRef       = useRef<HTMLSpanElement>(null);
    const barRef            = useRef<HTMLDivElement>(null);
    const flashRef          = useRef<HTMLDivElement>(null);

    const aRefs = useRef<HTMLSpanElement[]>([]);
    const bRefs = useRef<HTMLSpanElement[]>([]);

    const W1 = 'ABDULLAH';
    const W2 = 'BAKHEET';

    useEffect(() => {
        aRefs.current = aRefs.current.slice(0, W1.length);
        bRefs.current = bRefs.current.slice(0, W2.length);

        const ctx = gsap.context(() => {

            // ── INITIAL STATE ────────────────────────────────────────────────
            gsap.set(containerRef.current, { opacity: 1 });

            // Colour overlays start fully transparent
            gsap.set([topOverlayRef.current, bottomOverlayRef.current], { opacity: 0 });

            // Force letter colours via GSAP (beats CSS cascade)
            gsap.set(aRefs.current, { color: LIGHT, y: '105%' });
            gsap.set(bRefs.current, { color: LIGHT, y: '-105%' });

            gsap.set(logoRef.current,     { opacity: 0, y: -18, filter: 'blur(5px)', color: LIGHT });
            gsap.set(subtitleRef.current, { opacity: 0, letterSpacing: '0.55em', color: `${LIGHT}66` });
            gsap.set(counterRef.current,  { opacity: 0, y: 8, color: LIGHT });

            gsap.set(lineLeftRef.current,  { scaleX: 0, transformOrigin: 'right center' });
            gsap.set(lineRightRef.current, { scaleX: 0, transformOrigin: 'left center' });
            gsap.set(lineVRef.current,     { scaleY: 0, opacity: 0, transformOrigin: 'center center' });

            gsap.set(barRef.current,   { scaleX: 0, transformOrigin: 'left center' });
            gsap.set(flashRef.current, { opacity: 0 });

            // ── TIMELINE ─────────────────────────────────────────────────────
            const tl = gsap.timeline({ onComplete });

            // 1. Stage lines draw outward
            tl.to(lineLeftRef.current,  { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 0.05)
              .to(lineRightRef.current, { scaleX: 1, duration: 0.6, ease: 'power2.inOut' }, 0.05);

            // 2. Logo reveals
            tl.to(logoRef.current, {
                opacity: 1, y: 0, filter: 'blur(0px)',
                duration: 0.7, ease: 'power3.out',
            }, 0.2);

            // 3. ABDULLAH letters lift from below clip boundary
            tl.to(aRefs.current, {
                y: '0%', duration: 1.0,
                stagger: { each: 0.04, from: 'start' },
                ease: 'power4.out',
            }, 0.5);

            // 4. BAKHEET letters drop from above clip boundary
            tl.to(bRefs.current, {
                y: '0%', duration: 1.0,
                stagger: { each: 0.04, from: 'start' },
                ease: 'power4.out',
            }, 0.62);

            // 5. Subtitle tracking tightens in
            tl.to(subtitleRef.current, {
                opacity: 1, letterSpacing: '0.26em',
                duration: 0.85, ease: 'power2.out',
            }, 1.1);

            // 6. Counter springs in
            tl.to(counterRef.current, {
                opacity: 1, y: 0, duration: 0.5, ease: 'back.out(2)',
            }, 1.25);

            // 7. Counter 0→100 + progress bar (both 1.55s, linear)
            const obj = { val: 0 };
            tl.to(obj, {
                val: 100, duration: 1.55, ease: 'none',
                onUpdate() {
                    if (countNumRef.current)
                        countNumRef.current.textContent = String(Math.round(obj.val));
                },
            }, 1.4);
            tl.to(barRef.current, { scaleX: 1, duration: 1.55, ease: 'none' }, 1.4);

            // ── COLOR SWAP at 50% (t = 1.4 + 1.55×0.5 = 2.175s) ─────────────
            // Fade LIGHT-coloured overlays into each panel — covers the dark gradient
            tl.to([topOverlayRef.current, bottomOverlayRef.current], {
                opacity: 1, duration: 0.6, ease: 'power2.inOut',
            }, 2.175);
            // Simultaneously flip all text to DARK
            tl.to([...aRefs.current, ...bRefs.current], {
                color: DARK, duration: 0.6, ease: 'power2.inOut',
            }, 2.175);
            tl.to(logoRef.current,    { color: DARK,          duration: 0.6, ease: 'power2.inOut' }, 2.175);
            tl.to(subtitleRef.current,{ color: `${DARK}88`,   duration: 0.6, ease: 'power2.inOut' }, 2.175);
            tl.to(counterRef.current, { color: DARK,          duration: 0.6, ease: 'power2.inOut' }, 2.175);
            tl.to([lineLeftRef.current, lineRightRef.current], {
                backgroundColor: `${DARK}22`, duration: 0.6, ease: 'power2.inOut',
            }, 2.175);

            // 8. Letter-spacing breathe at 100%
            tl.to([...aRefs.current, ...bRefs.current], {
                letterSpacing: '0.05em', duration: 0.2, ease: 'power1.in', stagger: 0,
            }, 3.05)
            .to([...aRefs.current, ...bRefs.current], {
                letterSpacing: '-0.01em', duration: 0.25, ease: 'power3.out',
            }, 3.25);

            // 9. Vertical flash line
            tl.to(lineVRef.current, { scaleY: 1, opacity: 1, duration: 0.1, ease: 'power4.out' }, 3.3)
              .to(lineVRef.current,  { opacity: 0, duration: 0.2 }, 3.4);

            // 10. Yellow seam flash
            tl.to(flashRef.current, { opacity: 1, duration: 0.08, ease: 'none' }, 3.35)
              .to(flashRef.current,  { opacity: 0, duration: 0.22, ease: 'power2.in' }, 3.43);

            // 11. Split exit
            tl.to(topPanelRef.current,    { yPercent: -100, duration: 1.0, ease: 'expo.inOut' }, 3.55);
            tl.to(bottomPanelRef.current, { yPercent: 100,  duration: 1.0, ease: 'expo.inOut' }, 3.55);

            // 12. Container fade
            tl.to(containerRef.current, { opacity: 0, duration: 0.2, ease: 'power1.in' }, 4.4);

        }, containerRef);

        return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onComplete]);

    // Shared styles
    const overlayStyle: React.CSSProperties = {
        position: 'absolute', inset: 0, zIndex: 3,
        backgroundColor: LIGHT, pointerEvents: 'none',
    };

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
            {/* Yellow seam flash */}
            <div ref={flashRef} style={{
                position: 'absolute', left: 0, right: 0, zIndex: 99,
                top: 'calc(50% - 3px)', height: '6px',
                backgroundColor: GOLD, pointerEvents: 'none',
            }} />

            {/* Vertical centre flash */}
            <div ref={lineVRef} style={{
                position: 'absolute', top: '15%', bottom: '15%',
                left: '50%', width: '1px', zIndex: 98,
                backgroundColor: GOLD, pointerEvents: 'none',
            }} />

            {/* ── TOP PANEL ── */}
            <div ref={topPanelRef} style={{ ...panelBase, top: 0 }}>
                {/* LIGHT overlay — fades in at 50% to swap background colour */}
                <div ref={topOverlayRef} style={overlayStyle} />
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
                {/* LIGHT overlay — fades in at 50% */}
                <div ref={bottomOverlayRef} style={overlayStyle} />
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
