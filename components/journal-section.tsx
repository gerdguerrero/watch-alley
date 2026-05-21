"use client"

import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import Image from 'next/image'

type Article = {
  id: number
  category: string
  date: string
  title: string
  excerpt: string
  image: string
}

const featured: Article = {
  id: 1,
  category: "In-Depth",
  date: "May 18, 2026",
  title: "Chronometric Excellence Under Extreme Deviation",
  excerpt:
    "An archival examination of how deep marine diving forced the evolution of temperature-stable balance springs.",
  image: "/journal/article-1.jpg",
}

const supporting: Article[] = [
  {
    id: 2,
    category: "Metallurgy",
    date: "May 14, 2026",
    title: "The Case for Grade 5 Titanium in Deep-Sea Divers",
    excerpt: "",
    image: "/journal/article-2.jpg",
  },
  {
    id: 3,
    category: "Horology",
    date: "May 10, 2026",
    title: "Inside the Atelier: Calibre 3235 Calibration",
    excerpt: "",
    image: "/journal/article-3.jpg",
  },
  {
    id: 4,
    category: "Chronicle",
    date: "May 6, 2026",
    title: "Chronology of the Archival 24-Hour GMT Bezel",
    excerpt: "",
    image: "/journal/article-4.jpg",
  },
]

export function JournalSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  })

  const imageY = useTransform(scrollYProgress, [0, 1], [60, -60])

  return (
    <section
      id="journal"
      ref={sectionRef}
      className="relative bg-[#0a0a0a] py-32 md:py-48 overflow-hidden"
    >
      {/* Subtle ambient gradient (matches Heritage) */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] pointer-events-none opacity-30"
        style={{
          background:
            'radial-gradient(circle at center, rgba(245, 158, 11, 0.03) 0%, transparent 50%)',
        }}
      />

      {/* Ghost title — matches HERITAGE pattern */}
      <div className="absolute top-24 left-0 right-0 text-center pointer-events-none">
        <h2
          className="font-light tracking-tight leading-none select-none"
          style={{
            fontSize: 'clamp(4rem, 15vw, 13rem)',
            background:
              'linear-gradient(180deg, rgba(250, 250, 249, 0.5) 0%, rgba(250, 250, 249, 0.2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          JOURNAL
        </h2>
      </div>

      <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-32 md:pt-48">
        <div className="max-w-7xl mx-auto">
          {/* Sub-label */}
          <motion.div
            className="flex items-center gap-4 mb-16 md:mb-20"
            initial={{ opacity: 0, x: -20 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
          >
            <div className="w-12 h-px bg-amber-500/60" />
            <span className="text-[11px] tracking-[0.3em] text-amber-500/80 uppercase font-mono">
              Latest Insights
            </span>
          </motion.div>

          {/* Featured — 70/30 asymmetric */}
          <div className="grid grid-cols-1 lg:grid-cols-[7fr_3fr] gap-10 lg:gap-16 items-center mb-24 md:mb-32">
            {/* Image */}
            <motion.div
              className="relative"
              style={{ y: imageY }}
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 1 }}
            >
              <div className="relative aspect-[4/3] rounded-3xl overflow-hidden group">
                <Image
                  src={featured.image}
                  alt={featured.title}
                  fill
                  className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className="text-[11px] tracking-[0.3em] text-amber-500/80 uppercase font-mono">
                  {featured.category}
                </span>
                <span className="w-1 h-1 rounded-full bg-zinc-700" />
                <span className="text-[11px] tracking-[0.2em] text-zinc-600 uppercase font-mono">
                  {featured.date}
                </span>
              </div>

              <h3 className="text-3xl md:text-4xl lg:text-5xl font-serif text-white leading-[1.1] mb-6">
                <span className="italic">{featured.title.split(' ').slice(0, 2).join(' ')}</span>{' '}
                <span className="text-zinc-500 font-light">
                  {featured.title.split(' ').slice(2).join(' ')}
                </span>
              </h3>

              <p className="text-base text-zinc-400 leading-relaxed mb-10 max-w-md line-clamp-2">
                {featured.excerpt}
              </p>

              <motion.button
                className="group flex items-center gap-4"
                whileHover={{ x: 8 }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-[12px] tracking-[0.2em] uppercase text-white">
                  Read Story
                </span>
                <div className="w-10 h-10 rounded-full border border-zinc-700 flex items-center justify-center group-hover:border-amber-500/50 group-hover:bg-amber-500/10 transition-all duration-300">
                  <svg
                    className="w-4 h-4 text-zinc-400 group-hover:text-amber-500 transition-colors"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M3 8H13M13 8L8 3M13 8L8 13"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </motion.button>
            </motion.div>
          </div>

          {/* Supporting grid — strict 3-column, borderless */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
            {supporting.map((article, i) => (
              <motion.article
                key={article.id}
                className="group cursor-pointer"
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.7, delay: i * 0.1 }}
              >
                {/* Masked image — restrained scale-up on hover */}
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-5">
                  <Image
                    src={article.image}
                    alt={article.title}
                    fill
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-500" />
                </div>

                {/* Meta + title — no excerpt */}
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] tracking-[0.25em] text-amber-500/70 uppercase font-mono">
                    {article.category}
                  </span>
                  <span className="w-0.5 h-0.5 rounded-full bg-zinc-700" />
                  <span className="text-[10px] tracking-[0.2em] text-zinc-600 uppercase font-mono">
                    {article.date}
                  </span>
                </div>
                <h4 className="text-xl md:text-2xl font-serif font-light text-zinc-100 leading-[1.2] group-hover:text-white transition-colors duration-300">
                  {article.title}
                </h4>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
