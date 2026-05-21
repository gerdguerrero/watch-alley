"use client"

import { useRef, useEffect } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { WatchScene } from './watch-scene'

gsap.registerPlugin(ScrollTrigger)

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const splineContainerRef = useRef<HTMLDivElement>(null)
  const ghostTextRef = useRef<HTMLHeadingElement>(null)
  const bottomLeftRef = useRef<HTMLDivElement>(null)
  const bottomRightRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"]
  })

  const splineY = useTransform(scrollYProgress, [0, 1], [0, 200])
  const splineScale = useTransform(scrollYProgress, [0, 1], [1, 0.85])
  const splineOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0])
  const ghostTextX = useTransform(scrollYProgress, [0, 1], [0, -100])
  const ghostTextOpacity = useTransform(scrollYProgress, [0, 0.5], [0.6, 0])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Animate bottom left content
      gsap.fromTo(
        bottomLeftRef.current,
        { y: 60, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1.2,
          delay: 0.8,
          ease: "power3.out",
        }
      )

      // Animate bottom right content
      gsap.fromTo(
        bottomRightRef.current,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          delay: 1,
          ease: "power3.out",
        }
      )

      // Parallax ghost text on scroll
      gsap.to(ghostTextRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
        y: 150,
        scale: 1.1,
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative h-screen bg-[#0a0a0a] text-zinc-100 overflow-hidden">
      {/* Subtle warm radial gradient for depth */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(180, 120, 60, 0.06) 0%, transparent 60%)'
        }}
      />

      {/* Header */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 mix-blend-difference"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-6">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className="text-sm font-medium tracking-[0.2em] text-zinc-100">
              WATCH ALLEY
            </span>
          </motion.div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-12">
            {['Home', 'Collection', 'Heritage'].map((item, i) => (
              <motion.a 
                key={item}
                href="#" 
                className={`text-[13px] transition-colors ${i === 0 ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-100'}`}
                whileHover={{ y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {item}
              </motion.a>
            ))}
          </nav>

          {/* CTA */}
          <motion.a 
            href="#" 
            className="text-[13px] text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-2 group"
            whileHover={{ x: 3 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <span className="border-b border-amber-500/50 group-hover:border-amber-400 pb-px">Inquire</span>
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
              <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.a>
        </div>
      </motion.header>

      {/* Background Ghost Text */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ x: ghostTextX, opacity: ghostTextOpacity }}
      >
        <h1 
          ref={ghostTextRef}
          className="font-serif text-[20vw] font-medium tracking-tight text-transparent"
          style={{
            WebkitTextStroke: '1px rgba(63, 63, 70, 0.25)',
          }}
        >
          CHRONO
        </h1>
      </motion.div>

      {/* 3D Watch Container - Centered with scroll animations */}
      <motion.div 
        ref={splineContainerRef}
        id="watch-canvas-container"
        className="absolute inset-0 z-10 flex items-center justify-center"
        style={{ 
          y: splineY, 
          opacity: splineOpacity,
        }}
      >
        <div className="w-full h-full max-w-6xl max-h-[90vh] mx-auto">
          <WatchScene />
        </div>
      </motion.div>

      {/* Bottom Left Content */}
      <div ref={bottomLeftRef} className="absolute bottom-12 md:bottom-16 left-6 md:left-12 lg:left-20 z-20 max-w-lg opacity-0">
        <motion.p 
          className="text-xs tracking-[0.25em] text-zinc-600 uppercase mb-3 font-mono"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          Curated Timepieces
        </motion.p>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-light leading-[1.15] tracking-tight mb-1">
          <span className="text-zinc-100 font-serif italic">Precision</span>
          <span className="text-zinc-500"> Meets</span>
        </h2>
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-light leading-[1.15] tracking-tight text-zinc-500">
          Timeless Elegance.
        </h2>
        <p className="text-sm text-zinc-600 leading-relaxed mt-4 max-w-sm hidden lg:block">
          Award-winning curation blending heritage, craftsmanship, and innovation.
        </p>
        <motion.button 
          className="mt-6 px-6 py-3 bg-zinc-100 text-zinc-900 text-xs tracking-[0.15em] uppercase flex items-center gap-3 group overflow-hidden relative"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <motion.span 
            className="absolute inset-0 bg-amber-500"
            initial={{ x: "-100%" }}
            whileHover={{ x: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          />
          <span className="relative z-10">Explore Collection</span>
          <svg className="w-3 h-3 relative z-10 group-hover:translate-x-1 transition-transform" viewBox="0 0 12 12" fill="none">
            <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </div>

      {/* Bottom Right Content */}
      <div ref={bottomRightRef} className="absolute bottom-12 md:bottom-16 right-6 md:right-12 lg:right-20 z-20 max-w-sm text-right hidden md:block opacity-0">
        <p className="text-sm text-zinc-400 leading-relaxed mb-5">
          Intricate complications, immersive design, bold heritage.
        </p>
        <div className="flex items-center gap-3 justify-end flex-wrap">
          {['Swiss Made', 'Limited Editions', 'Heritage'].map((tag, i) => (
            <motion.span 
              key={tag}
              className="px-4 py-2 border border-zinc-800 text-xs tracking-[0.15em] text-zinc-500 uppercase"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.4 + i * 0.1, duration: 0.5 }}
              whileHover={{ borderColor: 'rgb(245, 158, 11)', color: 'rgb(245, 158, 11)' }}
            >
              {tag}
            </motion.span>
          ))}
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
      >
        <span className="text-[9px] tracking-[0.3em] text-zinc-700 uppercase">Scroll</span>
        <motion.div 
          className="w-px h-6 bg-gradient-to-b from-zinc-700 to-transparent"
          animate={{ scaleY: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  )
}
