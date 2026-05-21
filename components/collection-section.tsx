"use client"

import { useRef, useState } from 'react'
import { motion, useInView, useTransform, useScroll, AnimatePresence } from 'framer-motion'
import { Watch, Timer, Compass } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'

type CollectionItem = {
  id: number
  name: string
  category: string
  image: string
  Icon: LucideIcon
}

const collections: CollectionItem[] = [
  {
    id: 1,
    name: "Perpetual",
    category: "Automatic",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Luxury%20automatic%20dress%20watch.png-KCeQsyKwyyreayLrwUBjWt95TIkOWL.jpeg",
    Icon: Watch,
  },
  {
    id: 2,
    name: "Chronograph",
    category: "Complication",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Premium%20chronograph%20sport%20watch.png-77CCRkPJeIPJrXgEMTPXEmLTm9lpnn.jpeg",
    Icon: Timer,
  },
  {
    id: 3,
    name: "Tourbillon",
    category: "Haute Horlogerie",
    image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/High-end%20tourbillon%20watch.png-XSsKuXxyfFjinJUCVaXu6LlzkhASjf.jpeg",
    Icon: Compass,
  },
]

const categories = ["All", "Automatic", "Complication", "Haute Horlogerie"]

function AccordionCard({
  item,
  isActive,
  onActivate,
  isMobile,
}: {
  item: CollectionItem
  isActive: boolean
  onActivate: () => void
  isMobile: boolean
}) {
  const { Icon } = item

  return (
    <motion.article
      className="relative overflow-hidden cursor-pointer"
      style={{
        backgroundImage: `url(${item.image})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '28px',
        flexShrink: 1,
        flexBasis: 0,
      }}
      animate={
        isMobile
          ? { minHeight: isActive ? 340 : 80 }
          : { flexGrow: isActive ? 5 : 1 }
      }
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      onMouseEnter={!isMobile ? onActivate : undefined}
      onClick={isMobile ? onActivate : undefined}
    >
      {/* Overlay */}
      <motion.div
        className="absolute inset-0"
        animate={{
          background: isActive
            ? 'linear-gradient(to top, rgba(0,0,0,0.85) 35%, rgba(0,0,0,0.2) 100%)'
            : 'rgba(0,0,0,0.45)',
        }}
        transition={{ duration: 0.5 }}
      />

      {/* Collapsed icon — centered at bottom */}
      <AnimatePresence>
        {!isActive && (
          <motion.div
            className="absolute bottom-6 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <Icon className="w-5 h-5 text-black" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded content — bottom left */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 p-7"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="flex items-end gap-5">
              <div className="w-12 h-12 rounded-full bg-white flex-shrink-0 flex items-center justify-center">
                <Icon className="w-5 h-5 text-black" />
              </div>
              <div>
                <div className="w-8 h-px bg-amber-500/60 mb-3" />
                <h3 className="text-4xl md:text-5xl font-light text-white leading-none mb-1.5">
                  {item.name}
                </h3>
                <p className="text-[10px] tracking-[0.25em] uppercase text-zinc-400">
                  {item.category}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

export function CollectionSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [activeCategory, setActiveCategory] = useState("All")
  const [activeId, setActiveId] = useState(collections[0].id)
  const isMobile = useIsMobile()
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"]
  })

  const titleY = useTransform(scrollYProgress, [0, 1], [100, -100])

  return (
    <section id="collection" ref={sectionRef} className="relative bg-[#0a0a0a] py-32 md:py-48 overflow-hidden">
      {/* Ambient glow — unchanged */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(245, 158, 11, 0.08) 0%, transparent 60%)',
          }}
        />
        <svg className="absolute top-32 left-1/2 -translate-x-1/2 w-[800px] h-[200px] opacity-30" viewBox="0 0 800 200">
          <path d="M 0 200 Q 400 0 800 200" fill="none" stroke="url(#arcGradient)" strokeWidth="1" />
          <defs>
            <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="rgba(245, 158, 11, 0.6)" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Title — unchanged */}
      <motion.div className="relative z-10 text-center mb-20" style={{ y: titleY }}>
        <h2
          ref={titleRef}
          className="font-light tracking-tight leading-none select-none"
          style={{
            fontSize: 'clamp(3.5rem, 13vw, 11rem)',
            background: 'linear-gradient(180deg, rgba(250, 250, 249, 0.5) 0%, rgba(250, 250, 249, 0.2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          COLLECTION
        </h2>
      </motion.div>

      {/* Filter pills — unchanged */}
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
            className={`px-6 py-3 md:py-2.5 rounded-full text-[11px] tracking-[0.15em] uppercase border transition-all duration-300 ${
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

      {/* Accordion cards */}
      <div className="relative z-10 px-6 md:px-12 lg:px-20">
        <div
          className="max-w-7xl mx-auto gap-3 flex flex-col md:flex-row md:h-[580px]"
        >
          {collections.map((item) => (
            <AccordionCard
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              onActivate={() => setActiveId(item.id)}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
