"use client"

import { useRef, useEffect } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Image from 'next/image'

gsap.registerPlugin(ScrollTrigger)

export function HeritageSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  })

  const imageY = useTransform(scrollYProgress, [0, 1], [100, -100])
  const textY = useTransform(scrollYProgress, [0, 1], [50, -50])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Text reveal animation
      const chars = textRef.current?.querySelectorAll('.char')
      if (chars) {
        gsap.fromTo(chars, 
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.03,
            ease: "power3.out",
            scrollTrigger: {
              trigger: textRef.current,
              start: "top 75%",
              toggleActions: "play none none none",
            },
          }
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section id="heritage" ref={sectionRef} className="relative bg-[#0a0a0a] py-32 md:py-48 overflow-hidden">
      {/* Subtle ambient gradient */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] pointer-events-none opacity-30"
        style={{
          background: 'radial-gradient(circle at center, rgba(245, 158, 11, 0.03) 0%, transparent 50%)',
        }}
      />

      {/* Large ghost title - MDX style */}
      <div className="absolute top-24 left-0 right-0 text-center pointer-events-none">
        <h2
          className="font-light tracking-tight leading-none select-none"
          style={{
            fontSize: 'clamp(4rem, 15vw, 13rem)',
            background: 'linear-gradient(180deg, rgba(250, 250, 249, 0.5) 0%, rgba(250, 250, 249, 0.2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          HERITAGE
        </h2>
      </div>

      <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-32 md:pt-48">
        <div className="max-w-7xl mx-auto">
          
          {/* Main content - asymmetric layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left - Large image with parallax */}
            <motion.div 
              className="lg:col-span-7 relative"
              style={{ y: imageY }}
            >
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden group">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Elegant%20luxury%20watch%20boutique%20interior.png-sLmmCilQ5pezpoIZITwGSXhTLEueCp.jpeg"
                  alt="Watch Alley luxury boutique interior"
                  fill
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 60vw"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Floating badge */}
                <motion.div 
                  className="absolute bottom-8 left-8 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 0.6 }}
                >
                  <span className="text-[10px] tracking-[0.3em] text-amber-500/80 uppercase block mb-1">Established</span>
                  <span className="text-2xl font-serif text-white">2026</span>
                </motion.div>
              </div>
              
              {/* Secondary smaller image - overlapping */}
              <motion.div 
                className="absolute -bottom-12 -right-6 md:right-12 w-48 md:w-64 aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/5 hidden md:block"
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8 }}
              >
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Sophisticated%20gentleman%27s%20hands.png-QrbwxXTOIIowDpfyJnC6HAOjWtqw6h.jpeg"
                  alt="Collector examining timepiece"
                  fill
                  className="object-cover"
                  sizes="256px"
                />
              </motion.div>
            </motion.div>

            {/* Right - Content */}
            <motion.div 
              className="lg:col-span-5 lg:pl-8"
              style={{ y: textY }}
            >
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.8 }}
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-px bg-amber-500/60" />
                  <span className="text-[11px] tracking-[0.3em] text-amber-500/80 uppercase font-mono">
                    Our Story
                  </span>
                </div>

                <div ref={textRef}>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-white leading-[1.1] mb-8">
                    <span className="italic">Curating</span>{" "}
                    <span className="text-zinc-500 font-light">Time&apos;s</span>
                    <br />
                    <span className="text-zinc-500 font-light">Finest</span>{" "}
                    <span className="italic">Moments</span>
                  </h2>
                </div>

                <p className="text-base text-zinc-400 leading-relaxed mb-6 max-w-md">
                  Watch Alley was founded on a singular vision: to connect discerning collectors 
                  with the world&apos;s most exceptional timepieces.
                </p>
                
                <p className="text-sm text-zinc-600 leading-relaxed mb-12 max-w-md">
                  Our curators travel the globe, seeking rare complications, limited editions, 
                  and pieces that tell stories of master craftsmen who dedicated their lives to perfection.
                </p>

                {/* Stats row */}
                <div className="flex gap-12 pt-8 border-t border-zinc-800/50">
                  {[
                    { value: "50+", label: "Partner Brands" },
                    { value: "200+", label: "Rare Pieces" },
                  ].map((stat, i) => (
                    <motion.div 
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 + i * 0.1, duration: 0.6 }}
                    >
                      <span className="text-4xl md:text-5xl font-serif text-white block mb-2">
                        {stat.value}
                      </span>
                      <span className="text-[10px] tracking-[0.2em] text-zinc-600 uppercase">
                        {stat.label}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <motion.button
                  className="mt-12 group flex items-center gap-4"
                  whileHover={{ x: 8 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-[12px] tracking-[0.2em] uppercase text-white">
                    Learn Our Story
                  </span>
                  <div className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center group-hover:border-amber-500/50 group-hover:bg-amber-500/10 transition-all duration-300">
                    <svg className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 transition-colors" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8H13M13 8L8 3M13 8L8 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
