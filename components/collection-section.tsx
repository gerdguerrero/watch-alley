"use client"

import { useRef, useEffect, useState } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform, useScroll } from 'framer-motion'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Image from 'next/image'

gsap.registerPlugin(ScrollTrigger)

const collections = [
  {
    id: 1,
    name: "Perpetual",
    category: "Automatic",
    description: "Self-winding excellence with 72-hour power reserve",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Luxury%20automatic%20dress%20watch.png-KCeQsyKwyyreayLrwUBjWt95TIkOWL.jpeg",
  },
  {
    id: 2,
    name: "Chronograph",
    category: "Complication",
    description: "Precision timing with flyback functionality",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Premium%20chronograph%20sport%20watch.png-77CCRkPJeIPJrXgEMTPXEmLTm9lpnn.jpeg",
  },
  {
    id: 3,
    name: "Tourbillon",
    category: "Haute Horlogerie",
    description: "Gravitational defiance in perpetual motion",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/High-end%20tourbillon%20watch.png-XSsKuXxyfFjinJUCVaXu6LlzkhASjf.jpeg",
  },
]

const categories = ["All", "Automatic", "Complication", "Haute Horlogerie"]

function CollectionCard({ item, index }: { item: typeof collections[0], index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)
  
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  
  const springConfig = { damping: 25, stiffness: 150 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)
  
  const imageX = useTransform(x, [-0.5, 0.5], [20, -20])
  const imageY = useTransform(y, [-0.5, 0.5], [20, -20])
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    mouseX.set((e.clientX - centerX) / rect.width)
    mouseY.set((e.clientY - centerY) / rect.height)
  }

  return (
    <motion.article 
      ref={cardRef}
      className="group relative bg-zinc-900/30 rounded-3xl overflow-hidden cursor-pointer"
      initial={{ opacity: 0, y: 80 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.9, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        mouseX.set(0)
        mouseY.set(0)
      }}
    >
      <div className="relative aspect-[4/5] overflow-hidden">
        <motion.div
          className="absolute inset-[-20px]"
          style={{ x: imageX, y: imageY }}
          animate={{ scale: isHovered ? 1.1 : 1.05 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </motion.div>
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
        <motion.div 
          className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent"
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="flex items-center gap-3 mb-4">
          <motion.div 
            className="w-8 h-px bg-amber-500/60"
            animate={{ width: isHovered ? 48 : 32 }}
            transition={{ duration: 0.4 }}
          />
          <span className="text-[10px] tracking-[0.3em] text-amber-500/80 uppercase">
            {item.category}
          </span>
        </div>
        
        <motion.h3 
          className="text-2xl md:text-3xl font-light text-white mb-3"
          animate={{ y: isHovered ? -8 : 0 }}
          transition={{ duration: 0.4 }}
        >
          {item.name}
        </motion.h3>
        
        <motion.p 
          className="text-sm text-zinc-400 leading-relaxed mb-6"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 15 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          {item.description}
        </motion.p>

        <motion.div 
          className="flex items-center gap-3"
          animate={{ opacity: isHovered ? 1 : 0.6 }}
          transition={{ duration: 0.3 }}
        >
          <motion.span 
            className="text-[11px] tracking-[0.2em] uppercase text-white/80"
            animate={{ x: isHovered ? 4 : 0 }}
            transition={{ duration: 0.3 }}
          >
            View Collection
          </motion.span>
          <motion.svg 
            className="w-4 h-4 text-amber-500" 
            viewBox="0 0 16 16" 
            fill="none"
            animate={{ x: isHovered ? 8 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <path d="M3 8H13M13 8L8 3M13 8L8 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </motion.svg>
        </motion.div>
      </div>

      {/* Border glow on hover */}
      <motion.div 
        className="absolute inset-0 rounded-3xl pointer-events-none"
        animate={{
          boxShadow: isHovered 
            ? '0 0 0 1px rgba(245, 158, 11, 0.2) inset, 0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
            : '0 0 0 1px rgba(255, 255, 255, 0.03) inset',
        }}
        transition={{ duration: 0.4 }}
      />
    </motion.article>
  )
}

export function CollectionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [activeCategory, setActiveCategory] = useState("All")
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })
  
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  })
  
  const titleY = useTransform(scrollYProgress, [0, 1], [100, -100])

  useEffect(() => {
    const ctx = gsap.context(() => {
      // No opacity animation - title is always visible
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} className="relative bg-[#0a0a0a] py-32 md:py-48 overflow-hidden">
      {/* Ambient glow - MDX style arc */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)',
          }}
        />
        {/* Arc line */}
        <svg className="absolute top-32 left-1/2 -translate-x-1/2 w-[800px] h-[200px] opacity-30" viewBox="0 0 800 200">
          <path 
            d="M 0 200 Q 400 0 800 200" 
            fill="none" 
            stroke="url(#arcGradient)" 
            strokeWidth="1"
          />
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(245, 158, 11, 0.6)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Large centered title - MDX style */}
      <motion.div 
        className="relative z-10 text-center mb-20"
        style={{ y: titleY }}
      >
        <h2 
          ref={titleRef}
          className="text-[15vw] md:text-[12vw] font-light tracking-tight leading-none select-none"
          style={{
            background: 'linear-gradient(180deg, rgba(250, 250, 249, 0.5) 0%, rgba(250, 250, 249, 0.2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          COLLECTION
        </h2>
      </motion.div>

      {/* Filter pills - MDX style */}
      <motion.div 
        className="relative z-10 flex flex-wrap justify-center gap-3 mb-16 md:mb-24 px-6"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {categories.map((category) => (
          <motion.button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-6 py-2.5 rounded-full text-[11px] tracking-[0.15em] uppercase border transition-all duration-300 ${
              activeCategory === category 
                ? 'bg-white text-black border-white' 
                : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            {category}
          </motion.button>
        ))}
      </motion.div>

      {/* Collection Grid */}
      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto">
          {collections.map((item, index) => (
            <CollectionCard key={item.id} item={item} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
