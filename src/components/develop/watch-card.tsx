"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { formatPhp } from "@/lib/inventory/format";
import type { Watch } from "@/lib/inventory/types";

interface WatchCardProps {
  watch: Watch;
  /** Stagger index used for the in-view entrance delay. */
  index?: number;
  /** Force grayscale + "Sold" treatment regardless of status. */
  variant?: "default" | "sold";
}

/**
 * Develop-aesthetic watch card. Rounded-3xl, gradient overlays, magnetic
 * cursor parallax on the image, amber accents. Used by /available,
 * CollectionSection on /, and /sold (variant="sold").
 */
export function WatchCard({ watch, index = 0, variant = "default" }: WatchCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 150 };
  const x = useSpring(mouseX, springConfig);
  const y = useSpring(mouseY, springConfig);

  const imageX = useTransform(x, [-0.5, 0.5], [20, -20]);
  const imageY = useTransform(y, [-0.5, 0.5], [20, -20]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set((e.clientX - centerX) / rect.width);
    mouseY.set((e.clientY - centerY) / rect.height);
  };

  const isSold = variant === "sold" || watch.status === "sold";
  const category = watch.movement || watch.edition || watch.conditionLabel || watch.brand;

  return (
    <Link
      href={`/watch/${watch.slug}`}
      ref={cardRef}
      className="group relative block bg-black/25 rounded-3xl overflow-hidden border border-amber-400/10"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        mouseX.set(0);
        mouseY.set(0);
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{
          duration: 0.55,
          delay: Math.min(index * 0.05, 0.3),
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          <motion.div
            className={`absolute inset-[-20px] ${isSold ? "[filter:grayscale(0.6)]" : ""}`}
            style={{ x: imageX, y: imageY }}
            animate={{ scale: isHovered ? 1.1 : 1.05 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            {watch.primaryImage ? (
              <Image
                src={watch.primaryImage}
                alt={`${watch.brand} ${watch.name}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 bg-black" />
            )}
          </motion.div>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80" />
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-amber-300/10 via-transparent to-transparent"
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.5 }}
          />

          {watch.badge && !isSold && (
            <span className="absolute top-5 left-5 px-3 py-1.5 border border-amber-300/40 bg-black/40 backdrop-blur-sm text-[9px] tracking-[0.25em] uppercase text-amber-300">
              {watch.badge}
            </span>
          )}
          {isSold && (
            <span className="absolute top-5 left-5 px-3 py-1.5 border border-white/20 bg-black/50 backdrop-blur-sm text-[9px] tracking-[0.25em] uppercase text-cream-60">
              Sold {watch.soldAt ? `· ${formatSoldMonth(watch.soldAt)}` : ""}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-8 h-px bg-amber-300/70"
              animate={{ width: isHovered ? 48 : 32 }}
              transition={{ duration: 0.4 }}
            />
            <span className="text-[10px] tracking-[0.3em] text-amber-300/80 uppercase">
              {watch.brand}
            </span>
          </div>

          <motion.h3
            className="text-2xl md:text-3xl font-light text-cream mb-2"
            animate={{ y: isHovered ? -8 : 0 }}
            transition={{ duration: 0.4 }}
          >
            {watch.name}
          </motion.h3>

          <p className="text-[11px] tracking-[0.18em] uppercase text-cream-60 mb-3">{category}</p>

          {watch.description && (
            <motion.p
              className="text-sm text-cream-60 leading-relaxed mb-6 line-clamp-2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 15 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {watch.description}
            </motion.p>
          )}

          <motion.div
            className="flex items-center justify-between gap-3"
            animate={{ opacity: isHovered ? 1 : 0.85 }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-lg font-serif text-amber-300">
              {isSold && watch.soldPrice ? formatPhp(watch.soldPrice) : formatPhp(watch.price)}
            </span>
            <motion.span
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase text-cream"
              animate={{ x: isHovered ? 4 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {isSold ? "View Piece" : "View Piece"}
              <motion.svg
                className="w-4 h-4 text-amber-300"
                viewBox="0 0 16 16"
                fill="none"
                animate={{ x: isHovered ? 4 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <path
                  d="M3 8H13M13 8L8 3M13 8L8 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.svg>
            </motion.span>
          </motion.div>
        </div>

        {/* Border glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          animate={{
            boxShadow: isHovered
              ? "0 0 0 1px rgba(245, 158, 11, 0.2) inset, 0 25px 50px -12px rgba(0, 0, 0, 0.5)"
              : "0 0 0 1px rgba(255, 255, 255, 0.03) inset",
          }}
          transition={{ duration: 0.4 }}
        />
      </motion.div>
    </Link>
  );
}

function formatSoldMonth(soldAt: string): string {
  if (!/^\d{4}-\d{2}/.test(soldAt)) return "";
  const [year, month] = soldAt.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const idx = Math.max(0, Math.min(11, Number(month) - 1));
  return `${months[idx]} ${year}`;
}
