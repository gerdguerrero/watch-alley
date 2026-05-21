"use client"

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { WatchDisplay } from './watch-display'

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  return (
    <section ref={sectionRef} className="relative bg-[#0a0a0a] py-24 md:py-32 overflow-hidden">
      {/* Dramatic amber glow behind the CTA */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.08) 0%, rgba(180, 120, 60, 0.03) 40%, transparent 70%)'
        }}
      />
      
      {/* Secondary glow at bottom */}
      <div 
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[400px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 100%, rgba(245, 158, 11, 0.05) 0%, transparent 60%)'
        }}
      />

      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        {/* Main CTA Content */}
        <motion.div 
          className="max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 60 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Two column layout - Image + Text */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center mb-20">
            {/* Left - 3D Watch */}
            <motion.div 
              className="relative order-2 lg:order-1"
              initial={{ opacity: 0, x: -40 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <div className="relative aspect-square max-w-md mx-auto">
                {/* Glow behind watch */}
                <div 
                  className="absolute inset-0 blur-3xl opacity-50"
                  style={{
                    background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.4) 0%, transparent 60%)'
                  }}
                />
                <div className="relative z-10 w-full h-full">
                  <WatchDisplay />
                </div>
              </div>
            </motion.div>

            {/* Right - CTA Text */}
            <div className="order-1 lg:order-2 text-center lg:text-left">
              <motion.p 
                className="text-[11px] tracking-[0.3em] text-amber-500 uppercase mb-6 font-mono"
                initial={{ opacity: 0 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.2, duration: 0.6 }}
              >
                Begin Your Journey
              </motion.p>
              <h2 className="text-4xl md:text-5xl lg:text-6xl leading-[1.1] mb-6">
                <span className="font-serif italic text-zinc-100">Ready to Find</span><br />
                <span className="font-serif italic text-zinc-100">Your </span>
                <span className="text-zinc-500 font-light">Perfect</span><br />
                <span className="text-zinc-500 font-light">Timepiece?</span>
              </h2>
              <p className="text-[15px] text-zinc-500 leading-relaxed max-w-md mx-auto lg:mx-0 mb-10">
                Our specialists are ready to guide you through our curated collection 
                and help you discover the watch that speaks to your soul.
              </p>

              {/* CTA Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <motion.button 
                  className="px-8 py-4 bg-amber-500 text-zinc-900 text-[12px] tracking-[0.15em] uppercase flex items-center gap-3 group font-medium"
                  whileHover={{ scale: 1.02, backgroundColor: "rgb(251, 191, 36)" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <span>Schedule Consultation</span>
                  <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" viewBox="0 0 12 12" fill="none">
                    <path d="M1 11L11 1M11 1H3M11 1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </motion.button>
                <motion.button 
                  className="px-8 py-4 border border-zinc-700 text-zinc-300 text-[12px] tracking-[0.15em] uppercase transition-all duration-300 hover:border-zinc-500 hover:text-zinc-100"
                  whileTap={{ scale: 0.98 }}
                >
                  View Collection
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="pt-12 border-t border-zinc-900/50"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Logo */}
            <span className="text-sm font-medium tracking-[0.2em] text-zinc-500">
              WATCH ALLEY
            </span>

            {/* Links */}
            <nav className="flex items-center gap-8">
              {['Collection', 'Heritage', 'Contact', 'Privacy'].map((link) => (
                <motion.a 
                  key={link}
                  href="#" 
                  className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {link}
                </motion.a>
              ))}
            </nav>

            {/* Copyright */}
            <p className="text-[11px] text-zinc-700 tracking-wide">
              &copy; 2026 Watch Alley. All rights reserved.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
