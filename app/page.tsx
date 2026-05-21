"use client"

import { Hero } from "@/components/hero"
import { CollectionSection } from "@/components/collection-section"
import { JournalSection } from "@/components/journal-section"
import { HeritageSection } from "@/components/heritage-section"
import { ContactSection } from "@/components/contact-section"
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider"

export default function Page() {
  return (
    <SmoothScrollProvider>
      <main className="bg-[#0a0a0a]">
        <Hero />
        <CollectionSection />
        <JournalSection />
        <HeritageSection />
        <ContactSection />
      </main>
    </SmoothScrollProvider>
  )
}
