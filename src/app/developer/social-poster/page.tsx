"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function SocialPosterPage() {
  // 1. Interactive States for Customization
  const [styleId, setStyleId] = useState<number>(4); // Default to Style 4 (Luxury Gold & Emerald)
  const [headline, setHeadline] = useState<string>("AI CAN READ AI.");
  const [subHeadline, setSubHeadline] = useState<string>(
    "How an AI agent bypassed proprietary walls to natively view and parse Adobe Illustrator (.ai) vector assets in real-time."
  );
  const [author, setAuthor] = useState<string>("Viron Estrada");
  const [project, setProject] = useState<string>("THE WATCH ALLEY");
  const [isClient, setIsClient] = useState<boolean>(false);

  // Read URL parameters on load for automated CLI screenshots
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlStyle = params.get("style");
      const urlHeadline = params.get("headline");
      const urlSub = params.get("sub");
      const urlAuthor = params.get("author");
      const urlProject = params.get("project");

      if (urlStyle) setStyleId(parseInt(urlStyle, 10));
      if (urlHeadline) setHeadline(urlHeadline);
      if (urlSub) setSubHeadline(urlSub);
      if (urlAuthor) setAuthor(urlAuthor);
      if (urlProject) setProject(urlProject);
    }
  }, []);

  if (!isClient) return null;

  return (
    <div className="min-h-screen bg-[#0e0f11] text-white flex flex-row">
      {/* ── LEFT PANEL: INTERACTIVE CONTROLS (Hidden during screenshots via media query) ── */}
      <div className="w-[380px] border-r border-zinc-800 p-8 flex flex-col justify-between overflow-y-auto print-hide no-screenshot-ui">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="bg-amber-500/20 text-amber-500 font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded">
              WA Studio
            </span>
            <h2 className="font-bold text-lg tracking-tight">Poster Engine</h2>
          </div>

          {/* Style Selector */}
          <div className="mb-6">
            <fieldset className="flex flex-col gap-2">
              <legend className="block text-[11px] uppercase tracking-wider text-zinc-400 font-bold mb-2">
                Select Poster Style
              </legend>
              {[
                { id: 1, name: "Style 1: Wired Editorial Spread" },
                { id: 2, name: "Style 2: Vibrant Tech Infographic" },
                { id: 3, name: "Style 3: Playful Claymorphic Monitor" },
                { id: 4, name: "Style 4: Vibe Coders Premium Poster" },
                { id: 5, name: "Style 5: Hand-Drawn Chalkboard" },
              ].map((style) => (
                <button
                  type="button"
                  key={style.id}
                  aria-pressed={styleId === style.id}
                  onClick={() => setStyleId(style.id)}
                  className={`w-full text-left p-3 rounded-lg text-xs font-semibold transition-all border ${
                    styleId === style.id
                      ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/10"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  {style.name}
                </button>
              ))}
            </fieldset>
          </div>

          {/* Editable Text Fields */}
          <div className="space-y-4">
            <div>
              <label
                className="block text-[11px] uppercase tracking-wider text-zinc-400 font-bold mb-1"
                htmlFor="poster-headline"
              >
                Headline Text
              </label>
              <input
                id="poster-headline"
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label
                className="block text-[11px] uppercase tracking-wider text-zinc-400 font-bold mb-1"
                htmlFor="poster-subtitle"
              >
                Subtitle Text
              </label>
              <textarea
                id="poster-subtitle"
                value={subHeadline}
                rows={4}
                onChange={(e) => setSubHeadline(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500 resize-none"
              />
            </div>

            <div>
              <label
                className="block text-[11px] uppercase tracking-wider text-zinc-400 font-bold mb-1"
                htmlFor="poster-author"
              >
                Author
              </label>
              <input
                id="poster-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label
                className="block text-[11px] uppercase tracking-wider text-zinc-400 font-bold mb-1"
                htmlFor="poster-project"
              >
                Project Name
              </label>
              <input
                id="poster-project"
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* CLI Help */}
        <div className="mt-8 pt-6 border-t border-zinc-800 text-[11px] text-zinc-500 font-mono space-y-2">
          <div>Export via Terminal command:</div>
          <div className="bg-black/50 p-3 rounded border border-zinc-800/80 text-zinc-400 break-all select-all">
            pnpm run export-poster --style={styleId}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL: THE ACTUAL 1080x1350 POSTER CANVAS ── */}
      <div className="flex-1 flex justify-center items-center p-8 bg-[#070708] overflow-auto select-none">
        {/* Style 1: Wired Editorial Spread */}
        {styleId === 1 && (
          <div
            className="w-[1080px] h-[1350px] bg-[#121315] flex flex-col justify-between items-center p-[70px] relative select-none shrink-0"
            id="poster-canvas"
          >
            <div className="absolute inset-0 bg-radial-gradient-vignette pointer-events-none z-10"></div>

            {/* The 3D Open Magazine */}
            <div className="w-[960px] h-[640px] flex relative bg-[#f7f6f2] rounded shadow-[0_40px_90px_-15px_rgba(0,0,0,0.95)] overflow-hidden scale-[1.05] mt-[240px]">
              <div className="absolute top-0 left-[479px] w-[2px] h-full bg-black/45 z-4 shadow-[0_0_12px_rgba(0,0,0,0.4)]"></div>
              <div className="absolute top-0 left-[360px] w-[120px] h-full bg-gradient-to-r from-transparent to-black/20 z-3 pointer-events-none"></div>
              <div className="absolute top-0 left-[480px] w-[120px] h-full bg-gradient-to-l from-transparent to-black/20 z-3 pointer-events-none"></div>

              {/* Left Page */}
              <div className="w-[480px] h-full p-[45px] flex flex-col justify-between border-r border-black/5 relative z-2">
                <div>
                  <div className="flex justify-between items-center border-b-2 border-[#18191a] pb-2 mb-5">
                    <span className="text-[10px] font-black tracking-widest text-[#c39a48] uppercase">
                      {"Analysis // Discovery"}
                    </span>
                    <Image
                      src="/social/vibe-coders-logo-black.png"
                      className="h-[18px] w-auto object-contain"
                      alt="Vibe Coders PH"
                      width={2560}
                      height={1080}
                      priority
                      unoptimized
                    />
                  </div>
                  <div className="mb-4">
                    <span className="text-[14px] font-black tracking-wide uppercase text-[#18191a] block mb-1">
                      CASE STUDY
                    </span>
                    <h1 className="font-sans font-black text-[52px] leading-[0.88] tracking-tighter text-[#18191a] uppercase">
                      {headline.replace(".", "").split(" ").slice(0, 2).join(" ")}
                      <br />
                      {headline.replace(".", "").split(" ").slice(2).join(" ")}
                    </h1>
                  </div>
                  <p className="font-serif text-[15px] italic leading-[1.4] text-[#5e6268] mb-5">
                    {subHeadline}
                  </p>
                  <div className="flex gap-[20px] font-serif text-[11px] leading-[1.5] text-[#18191a] text-justify">
                    <div className="flex-1">
                      <span className="float-left font-sans text-[38px] leading-[0.8] font-black pr-2 pt-1 text-[#18191a]">
                        I
                      </span>
                      t was discovered during a standard pair-programming session for product
                      startup <strong>{project}</strong>. When presented with a raw, layered{" "}
                      <code>.ai</code> logo file, instead of failing or throwing an unsupported
                      extension error, the AI model inspected the file headers.
                    </div>
                    <div className="flex-1">
                      By utilizing a simple command-line binary (<code>pdftoppm</code>), the agent
                      was able to extract the high-resolution vector layout into a readable raster
                      image, feed it back into its own multimodal vision network, and fully
                      reconstruct the designer's intent natively.
                    </div>
                  </div>
                </div>
                <div className="border-t border-black/8 pt-3 flex justify-between text-[9px] font-bold text-[#5e6268] uppercase">
                  <span>Vibe Coders PH</span>
                  <span>{"May 2026 // Issue 5.27"}</span>
                </div>
              </div>

              {/* Right Page */}
              <div className="w-[480px] h-full p-[45px] flex flex-col justify-between bg-[#fafdff] relative z-2">
                <div>
                  <div className="flex justify-between items-center border-b-2 border-[#18191a] pb-2 mb-5">
                    <span className="text-[10px] font-black tracking-widest text-[#18191a] uppercase">
                      Visual Evidence
                    </span>
                    <span className="text-[9px] font-bold text-[#5e6268] tracking-wider">
                      FIG. 1.0
                    </span>
                  </div>
                  <div className="w-full h-[280px] border border-black/15 bg-[#090806] p-4 flex items-center justify-center shadow-inner mb-4">
                    <Image
                      src="/social/watch-alley-logo-preview.png"
                      className="max-w-full max-h-full object-contain"
                      alt="THE WATCH ALLEY"
                      width={4500}
                      height={2250}
                      priority
                      unoptimized
                    />
                  </div>
                  <div className="text-[10px] leading-[1.45] text-[#5e6268] border-left-2 border-[#18191a] pl-[10px] mb-[10px]">
                    <strong className="text-[#18191a] font-bold text-[9px] tracking-wider uppercase block mb-1">
                      Figure 1.0: Layer Extraction
                    </strong>
                    Rasterized preview of the raw vector logo files recovered natively from the
                    Illustrator file structure.
                  </div>
                  <div className="bg-[#1a1c1e] text-[#eaecef] rounded p-3 font-mono text-[9px] leading-[1.4] border-l-[3px] border-[#c39a48] shadow-md">
                    <div>
                      <span>$</span> file {project.replace(/\s+/g, "_")}_LOGOS.ai
                    </div>
                    <div className="text-[#dfb153]">&gt; PDF document, version 1.6, 1 pages</div>
                  </div>
                </div>
                <div className="border-t border-black/8 pt-3 flex justify-between text-[9px] font-bold text-[#5e6268] uppercase">
                  <span>{project} Archive</span>
                  <span>P. 43</span>
                </div>
              </div>
            </div>

            {/* Subtitle */}
            <div className="flex flex-col items-center z-20 mb-8">
              <h2 className="font-sans font-black text-[68px] leading-[0.9] tracking-tighter text-white uppercase text-shadow-lg">
                {headline}
              </h2>
              <p className="font-mono text-[13px] text-[#c39a48] tracking-[0.35em] uppercase text-shadow-md mt-3">
                By {author} {" // "} {project}
              </p>
            </div>
          </div>
        )}

        {/* Style 2: Vibrant Tech Infographic */}
        {styleId === 2 && (
          <div
            className="w-[1080px] h-[1350px] bg-[#0f0c1b] flex flex-col justify-between items-center p-[60px] relative select-none shrink-0"
            id="poster-canvas"
          >
            <div className="absolute inset-0 bg-radial-gradient-infographic opacity-20 pointer-events-none"></div>

            {/* Header */}
            <header className="w-full flex justify-between items-center border-b border-white/8 pb-5 z-10">
              <div className="flex items-center gap-3">
                <Image
                  src="/social/vibe-coders-logo-white.png"
                  className="h-[26px] w-auto object-contain"
                  alt="Vibe Coders PH"
                  width={2560}
                  height={1080}
                  priority
                  unoptimized
                />
                <div className="font-mono text-[12px] tracking-[0.2em] text-[#a0aec0] uppercase ml-2">
                  Bypassing Proprietary Walls
                </div>
              </div>
              <div className="text-right text-[12px] font-semibold text-[#a0aec0]">
                {project} {" // INBOX.13"}
              </div>
            </header>

            {/* Title */}
            <div className="text-center z-10 mt-[30px] mb-[30px] w-full">
              <span className="font-mono text-[14px] text-[#00f2fe] font-bold tracking-[0.4em] uppercase block mb-[10px]">
                THE VECTOR BREAKTHROUGH
              </span>
              <h1 className="font-sans font-black text-[78px] leading-[0.95] tracking-tighter uppercase text-white">
                {headline.replace(".", "").split(" ").slice(0, 3).join(" ")}{" "}
                <span className="bg-gradient-to-r from-[#00f2fe] to-[#ff007f] bg-clip-text text-transparent">
                  {headline.replace(".", "").split(" ").slice(3).join(" ")}
                </span>
              </h1>
            </div>

            {/* Grid */}
            <div className="w-full flex gap-10 flex-1 mb-[30px] items-stretch z-10">
              {/* Left Column */}
              <div className="flex-1 flex flex-col gap-5 justify-center">
                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex gap-5 items-start relative overflow-hidden backdrop-blur-md shadow-2xl">
                  <div className="text-[32px] font-black font-mono leading-none bg-gradient-to-br from-[#00f2fe] to-[#9d4edd] bg-clip-text text-transparent">
                    01
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold uppercase tracking-wider mb-[6px]">
                      The Carrier (.ai)
                    </h3>
                    <p className="text-[13px] leading-[1.5] text-[#a0aec0]">
                      Modern Adobe Illustrator files compile with an embedded, Acrobat-compliant PDF
                      stream (version 1.6) by default. The proprietary vector data contains a hidden
                      standard document structure.
                    </p>
                  </div>
                </div>

                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex gap-5 items-start relative overflow-hidden backdrop-blur-md shadow-2xl">
                  <div className="text-[32px] font-black font-mono leading-none bg-gradient-to-br from-[#00f2fe] to-[#9d4edd] bg-clip-text text-transparent">
                    02
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold uppercase tracking-wider mb-[6px]">
                      The Extraction (pdftoppm)
                    </h3>
                    <p className="text-[13px] leading-[1.5] text-[#a0aec0]">
                      Instead of manually exporting, coding agents execute a system command (
                      <code>pdftoppm</code>) directly on the raw file path. This extracts and
                      rasterizes the vector viewport into a crisp PNG layer.
                    </p>
                  </div>
                </div>

                <div className="bg-white/3 border border-white/8 rounded-2xl p-6 flex gap-5 items-start relative overflow-hidden backdrop-blur-md shadow-2xl">
                  <div className="text-[32px] font-black font-mono leading-none bg-gradient-to-br from-[#00f2fe] to-[#9d4edd] bg-clip-text text-transparent">
                    03
                  </div>
                  <div>
                    <h3 className="text-[18px] font-bold uppercase tracking-wider mb-[6px]">
                      The Cognition (LLM Vision)
                    </h3>
                    <p className="text-[13px] leading-[1.5] text-[#a0aec0]">
                      The coding agent passes the rendered layer into its multimodal vision network,
                      natively inspecting geometries, typographic details, and color palettes—fully
                      bridging design to code instantly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="w-[430px] bg-white/3 border border-white/8 rounded-3xl p-[30px] flex flex-col justify-between items-center backdrop-blur-md shadow-2xl">
                <div className="self-start border border-[#ff007f] text-[#ff007f] font-mono text-[10px] font-bold px-[10px] py-1 rounded uppercase tracking-wider shadow-[0_0_10px_rgba(255,0,127,0.2)]">
                  Case Exhibit 1.0
                </div>

                <div className="w-full h-[260px] bg-white/2 border border-white/5 rounded-2xl flex items-center justify-center p-[15px] my-[25px] shadow-inner relative overflow-hidden">
                  <Image
                    src="/social/watch-alley-logo-preview.png"
                    className="max-w-full max-h-full object-contain z-2"
                    alt="Watch Alley Blueprint"
                    width={4500}
                    height={2250}
                    priority
                    unoptimized
                  />
                </div>

                <div className="w-full bg-[#090a0f] border border-white/5 rounded-xl p-[18px] font-mono text-[11px] leading-[1.5]">
                  <div>
                    <span className="text-[#00f2fe]">$</span> file {project.replace(/\s+/g, "_")}
                    _LOGOS.ai
                  </div>
                  <div className="text-[#ffbe0b]">&gt; PDF document, version 1.6, 1 pages</div>
                  <div className="mt-2">
                    <span className="text-[#00f2fe]">$</span> pdftoppm -png -r 150 ...
                  </div>
                  <div className="text-[#ffbe0b]">&gt; Layer extracted. Rendering canvas...</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="w-full flex justify-between items-center border-t border-white/8 pt-5 z-10">
              <div>
                <span className="text-[11px] font-bold text-white/50 uppercase tracking-widest mr-1">
                  By
                </span>
                <span className="text-[11px] font-bold text-[#00f2fe] uppercase tracking-wider">
                  {author}
                </span>
              </div>
              <div className="font-mono text-[11px] text-[#a0aec0]">PROJECT: {project}</div>
            </footer>
          </div>
        )}

        {/* Style 3: Playful Claymorphic Monitor */}
        {styleId === 3 && (
          <div
            className="w-[1080px] h-[1350px] bg-gradient-to-br from-[#d6e2e9] to-[#f0ebf4] flex flex-col justify-between items-center p-[70px] relative select-none shrink-0"
            id="poster-canvas"
          >
            {/* Background 3D blobs */}
            <div className="absolute top-[80px] left-[60px] w-[120px] h-[120px] rounded-full bg-[#ffe5ec] shadow-[15px_15px_35px_rgba(0,0,0,0.12),inset_6px_6px_12px_rgba(255,255,255,0.8),inset_-6px_-6px_12px_rgba(0,0,0,0.04)] rotate-15 z-1"></div>
            <div className="absolute bottom-[120px] right-[-40px] w-[150px] h-[80px] rounded-[40px] bg-[#d8f3dc] shadow-[15px_15px_35px_rgba(0,0,0,0.12),inset_6px_6px_12px_rgba(255,255,255,0.8),inset_-6px_-6px_12px_rgba(0,0,0,0.04)] -rotate-25 z-1"></div>

            {/* Header */}
            <header className="w-full flex justify-between items-center z-10">
              <Image
                src="/social/vibe-coders-logo-white.png"
                className="h-[32px] w-auto object-contain filter brightness-50"
                alt="Vibe Coders"
                width={2560}
                height={1080}
                priority
                unoptimized
              />
              <div className="font-mono text-[13px] font-bold text-[#9d4edd] bg-[#9d4edd]/15 border border-[#9d4edd]/25 px-4 py-[6px] rounded-full uppercase tracking-widest shadow-inner">
                AI OS
              </div>
            </header>

            {/* Title */}
            <div className="text-center z-10 mt-5 mb-6">
              <span className="text-[14px] font-bold text-[#7b2cbf] tracking-[0.25em] uppercase block mb-2">
                A Toy Story Experiment
              </span>
              <h1 className="font-sans font-black text-[78px] leading-[0.95] tracking-tighter uppercase text-[#2f3e46]">
                {headline.replace(".", "").split(" ").slice(0, 3).join(" ")}{" "}
                <span className="text-[#9d4edd]">
                  {headline.replace(".", "").split(" ").slice(3).join(" ")}
                </span>
              </h1>
            </div>

            {/* Content Area */}
            <div className="w-full flex justify-center items-center gap-12 flex-1 z-10">
              {/* Left Computer monitor card */}
              <div className="w-[490px] h-[520px] bg-[#eae6df] border-[12px] border-[#d5bdaf] rounded-[44px] p-[30px] flex flex-col justify-between items-center shadow-[15px_15px_35px_rgba(0,0,0,0.12),inset_6px_6px_12px_rgba(255,255,255,0.8),inset_-6px_-6px_12px_rgba(0,0,0,0.04)] relative">
                <div className="w-full h-[380px] bg-[#1a1816] rounded-[24px] shadow-[inset_5px_5px_15px_rgba(0,0,0,0.08),0_4px_10px_rgba(255,255,255,0.9)] flex items-center justify-center p-5">
                  <Image
                    src="/social/watch-alley-logo-preview.png"
                    className="max-w-full max-h-[250px] object-contain"
                    alt="Watch Alley Logos"
                    width={4500}
                    height={2250}
                    priority
                    unoptimized
                  />
                </div>
                <div className="w-full flex justify-between items-center text-[11px] font-bold text-[#7b6d61] font-mono mt-3">
                  <span>monitor_v1.0</span>
                  <span className="bg-[#ffe5ec] text-[#ff007f] px-[10px] py-1 rounded-full text-[9px]">
                    LIVE_PREVIEW
                  </span>
                  <span>res: 1080px</span>
                </div>
              </div>

              {/* Right Clay Card */}
              <div className="w-[390px] h-[500px] bg-[#e8dbfc] rounded-[36px] p-[30px] flex flex-col justify-between shadow-[15px_15px_35px_rgba(0,0,0,0.12),inset_6px_6px_12px_rgba(255,255,255,0.8),inset_-6px_-6px_12px_rgba(0,0,0,0.04)] relative">
                <div className="bg-white/40 border border-white/20 rounded-[16px] px-[18px] py-[10px] self-start text-[11px] font-bold text-[#9d4edd] uppercase tracking-wider">
                  THE DISCOVERY
                </div>
                <div className="my-6">
                  <h2 className="text-[26px] font-black text-[#2f3e46] leading-[1.1] mb-3">
                    No more manual exports! ⚡
                  </h2>
                  <p className="text-[14px] leading-[1.5] text-[#52606d] font-semibold mb-3">
                    During a pair-programming session for <strong>{project}</strong>, we handed the
                    raw{" "}
                    <span className="bg-white rounded-lg px-[6px] py-[2px] font-mono text-[11px] text-[#9d4edd] shadow-inner">
                      .ai
                    </span>{" "}
                    path directly to the AI agent. It automatically read the hidden PDF layer and
                    parsed the vector paths in seconds.
                  </p>
                  <p className="text-[14px] leading-[1.5] text-[#52606d] font-semibold">
                    A seamless bridge between raw vector designs and actual production code.
                  </p>
                </div>
                <div className="flex gap-2 font-bold text-[11px]">
                  <div className="bg-white rounded-full px-[14px] py-[6px] text-[#40916c]">
                    #VectorDev
                  </div>
                  <div className="bg-white rounded-full px-[14px] py-[6px] text-[#7209b7]">
                    #Claymorphism
                  </div>
                  <div className="bg-white rounded-full px-[14px] py-[6px] text-[#ffb703]">
                    #{project.replace(/\s+/g, "")}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="w-full flex justify-between items-center z-10">
              <div className="bg-white/40 shadow-inner px-5 py-2 rounded-full font-bold flex gap-2 text-[11px]">
                <span className="text-[#5c677d]">Self Discovery By:</span>
                <span className="text-[#9d4edd]">{author}</span>
              </div>
              <div className="font-mono text-[11px] text-[#5c677d] uppercase tracking-wider font-bold">
                {"MAY 2026 // EDITION.13"}
              </div>
            </footer>
          </div>
        )}

        {/* Style 4: Vibe Coders Premium Poster */}
        {styleId === 4 && (
          <div
            className="w-[1080px] h-[1350px] flex flex-col justify-between items-center p-[75px] relative select-none shrink-0 overflow-hidden bg-[#04010d]"
            id="poster-canvas"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            {/* Google Fonts Link */}
            <link
              href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,700;0,800;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
              rel="stylesheet"
            />

            {/* Background fuchsia/violet glowing spotlights */}
            <div className="absolute -top-[200px] -right-[100px] w-[800px] h-[800px] rounded-full bg-[#d946ef]/10 blur-[150px] pointer-events-none z-0"></div>
            <div className="absolute -bottom-[200px] -left-[100px] w-[900px] h-[900px] rounded-full bg-[#7c4dff]/12 blur-[160px] pointer-events-none z-0"></div>

            {/* Subtle purple technical grid overlay */}
            <div
              className="absolute inset-0 w-full h-full pointer-events-none z-1 opacity-25"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(139, 92, 246, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 92, 246, 0.05) 1px, transparent 1px)",
                backgroundSize: "60px 60px",
              }}
            ></div>

            {/* Header */}
            <header className="w-full flex justify-between items-center border-b border-white/5 pb-6 z-10">
              <div
                className="text-[32px] font-bold tracking-[0.2em] uppercase text-white/95"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                @vaestrada
              </div>
              <div className="flex items-center gap-4">
                <div className="w-[140px] h-[140px] rounded-full bg-gradient-to-br from-[#d946ef] to-[#7c3aed] p-1 flex-shrink-0 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
                  <Image
                    src="/social/buloy_estrada_dp.png"
                    className="w-full h-full rounded-full object-cover"
                    alt="Viron Gil Estrada"
                    width={1024}
                    height={1024}
                    priority
                    unoptimized
                  />
                </div>
              </div>
            </header>

            {/* Title */}
            <div className="text-center z-10 mt-6 mb-[35px] w-full">
              <span
                className="text-[15px] text-[#d946ef] font-bold tracking-[0.5em] uppercase block mb-3"
                style={{ fontFamily: "'Space Mono', monospace" }}
              >
                A VECTOR SYSTEM UNLOCKED
              </span>
              <h1
                className="text-[88px] font-black leading-none tracking-tighter uppercase text-white"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {headline.replace(".", "").split(" ").slice(0, 2).join(" ")}{" "}
                <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-500 bg-clip-text text-transparent">
                  {headline.replace(".", "").split(" ").slice(2).join(" ")}
                </span>
              </h1>
            </div>

            {/* Viewport Box */}
            <div className="w-full flex-1 bg-white/[0.015] border border-white/5 rounded-[32px] flex p-12 gap-[60px] backdrop-blur-[25px] shadow-[0_30px_70px_rgba(0,0,0,0.5)] items-center mb-[45px] z-10">
              {/* Left Details */}
              <div className="flex-1 flex flex-col justify-between h-full">
                <div>
                  <div
                    className="text-[12px] text-[#d946ef] uppercase tracking-[0.2em] mb-5 font-bold"
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {"PLATE NO. 4 // SYSTEM"}
                  </div>
                  <h2
                    className="text-[38px] font-bold leading-[1.2] text-white border-b border-[#d946ef]/20 pb-4 mb-6"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    NATIVE COGNITION
                  </h2>
                  <p className="text-[17px] leading-[1.7] text-white/70 text-justify mb-[30px]">
                    During an active build sprint for product startup <strong>{project}</strong>, we
                    successfully demonstrated that modern LLM coding agents can natively read,
                    render, and catalog raw Adobe Illustrator (<code>.ai</code>) documents directly.
                    Modern vector design files compile with a hidden, Acrobat-compliant PDF stream
                    (version 1.6) by default. The agent identified this structure, executed a
                    headless extraction, and parsed the geometries without manual exports.
                  </p>
                </div>
                <div
                  className="bg-[#0c0621]/60 border border-[#d946ef]/20 rounded-2xl p-6 font-mono text-[12px] leading-[1.65] shadow-2xl"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  <div>
                    <span className="text-[#d946ef]">$</span> file {project.replace(/\s+/g, "_")}
                    _LOGOS.ai
                  </div>
                  <div className="text-white/95">&gt; PDF document, version 1.6, 1 pages</div>
                  <div className="mt-2.5">
                    <span className="text-[#d946ef]">$</span> pdftoppm -png -r 150 ...
                  </div>
                  <div className="text-white/95">&gt; Layer extracted. Rendering canvas...</div>
                </div>
              </div>

              {/* Right Visual Plate */}
              <div className="flex-[1.1] h-full bg-gradient-to-br from-white/[0.03] to-white/[0.005] border border-white/5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col justify-center items-center p-[40px] relative">
                <div
                  className="absolute top-4 left-6 text-[11px] text-[#d946ef] uppercase tracking-widest whitespace-nowrap font-bold"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  LIVE VECTOR BLUEPRINT SCAN
                </div>
                <div className="w-full bg-[#0b0518] border border-[#d946ef]/20 rounded-2xl p-8 shadow-[0_25px_50px_rgba(0,0,0,0.5)] flex items-center justify-center mb-6">
                  <Image
                    src="/social/watch-alley-logo-preview.png"
                    className="max-w-full max-h-[300px] object-contain"
                    alt="Watch Alley Blueprint"
                    width={4500}
                    height={2250}
                    priority
                    unoptimized
                  />
                </div>
                <div
                  className="text-[11px] text-[#f472b6] text-center uppercase tracking-[0.15em] border-t border-white/5 w-full pt-[18px]"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  FIGURE 4.0: VECTOR GEOMETRY LAYOUT COMPILED NATIVELY
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="w-full flex justify-between items-center border-t border-white/5 pt-8 z-10">
              <div className="flex flex-col items-start">
                <span
                  className="text-[12px] font-bold text-[#d946ef] uppercase tracking-[0.3em] mb-1"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  AUTHOR / DEVELOPER
                </span>
                <span
                  className="text-[68px] font-black text-white tracking-[0.18em] uppercase leading-none"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  VIRON GIL ESTRADA
                </span>
              </div>

              <div className="flex items-center gap-5 bg-white/[0.02] border border-white/5 backdrop-blur-md px-8 py-4 rounded-2xl shadow-xl">
                <span
                  className="text-[16px] text-white/40 tracking-widest uppercase font-bold"
                  style={{ fontFamily: "'Space Mono', monospace" }}
                >
                  POWERED BY
                </span>
                <Image
                  src="/social/vibe-coders-logo-white.png"
                  className="h-[44px] w-auto object-contain"
                  alt="Vibe Coders PH"
                  width={2560}
                  height={1080}
                  priority
                  unoptimized
                />
              </div>
            </footer>
          </div>
        )}

        {/* Style 5: Hand-Drawn Chalkboard */}
        {styleId === 5 && (
          <div
            className="w-[1080px] h-[1350px] bg-[#1c2321] flex flex-col justify-between items-center px-20 py-[70px] relative select-none shrink-0"
            id="poster-canvas"
            style={{ fontFamily: "'Architects Daughter', cursive" }}
          >
            {/* Spot light overlay */}
            <div className="absolute top-[-20%] left-[10%] w-[80px] h-[120px] bg-[#fff8dc]/8 rounded-full blur-[150px] pointer-events-none z-[2]"></div>

            {/* Boarder Frame shadow */}
            <div className="absolute inset-0 border-[24px] border-[#14110f] shadow-[inset_0_0_40px_rgba(0,0,0,0.9)] pointer-events-none z-10"></div>

            {/* Chalk board noise layer */}
            <div className="absolute inset-0 bg-chalk-texture opacity-5 pointer-events-none z-8"></div>

            {/* Header */}
            <header className="w-full flex justify-between items-center text-[18px] tracking-[0.1em] text-[#a8dadc] border-b border-dashed border-white/10 pb-[15px] z-10">
              <div>{"CHALKBOARD DEV DIARY // 2026"}</div>
              <div className="text-[#f4e285]">VibeCoders PH</div>
            </header>

            {/* Title */}
            <div className="text-center z-10 mt-5 mb-[30px]">
              <span className="text-[18px] text-[#f4e285] tracking-[0.2em] uppercase block mb-[10px]">
                How an AI agent parsed Illustrator blueprints
              </span>
              <h1 className="text-[84px] font-bold leading-none text-white text-shadow-chalk">
                {headline.replace(".", "").split(" ").slice(0, 3).join(" ")}{" "}
                <span className="text-[#f4e285]">
                  {headline.replace(".", "").split(" ").slice(3).join(" ")}
                </span>
              </h1>
            </div>

            {/* Grid */}
            <div className="w-full flex-1 flex gap-[50px] mb-[30px] items-center z-10">
              {/* Left Sketch */}
              <div className="flex-[1.1] h-full border border-dashed border-white/15 rounded-2xl p-[30px] flex flex-col justify-between relative">
                <div className="text-[16px] text-[#a8dadc] uppercase border-b border-dashed border-white/10 pb-2 mb-[15px]">
                  Blueprint Sketch: {project}
                </div>

                {/* Hand sketched vector elements */}
                <div className="w-full h-[250px] relative border border-dashed border-white/5 my-[15px]">
                  {/* Sketched letter A */}
                  <div className="absolute top-[20px] left-[100px] width-[180px] height-[200px] border-l-[3px] border-r-[3px] border-t-[3px] border-l-[#f4e285] border-r-[#f4e285] border-t-[#f4e285] rounded-t-[120px] opacity-65 w-[180px] h-[200px]"></div>
                  <div className="absolute top-[130px] left-[90px] w-[200px] h-[3px] bg-[#f4e285] opacity-65"></div>

                  {/* Sketched drafting divider */}
                  <div className="absolute top-[10px] left-[140px] w-[4px] h-[180px] bg-white -rotate-[15deg] opacity-75"></div>
                  <div className="absolute top-[10px] left-[140px] w-[4px] h-[180px] bg-white rotate-[20deg] origin-top opacity-75"></div>

                  <div className="absolute top-[5px] left-5 text-[12px] leading-tight text-[#fbc4ab]">
                    Golden Compass Leg
                    <br />
                    pointing down ↙
                  </div>
                  <div className="absolute top-[110px] right-[15px] text-[12px] leading-tight text-[#a8dadc]">
                    ← Vector Anchor
                    <br />& Bezier Handles!
                  </div>
                  <div className="absolute bottom-[10px] left-[120px] text-[12px] leading-tight text-[#fbc4ab]">
                    Pen nib styled as letter &quot;A&quot; ✒
                  </div>

                  <div className="absolute top-[30px] left-[80px] text-[16px] text-white/20">⤡</div>
                  <div className="absolute top-[100px] right-[80px] text-[16px] text-white/20">
                    ⤢
                  </div>
                  <div className="absolute bottom-[30px] left-[160px] text-[16px] text-white/20">
                    ⤓
                  </div>
                </div>

                <div className="text-[14px] leading-[1.5] text-white/75 border-t border-dashed border-white/10 pt-[15px]">
                  During a coding session on <strong>{project}</strong>, we bypassed Illustrator's
                  proprietary walls. Since Illustrator compiles with an Acrobat-compliant PDF 1.6
                  stream by default, we ran a simple command (<code>pdftoppm</code>) to rasterize
                  and inspect the vector paths natively. It worked flawlessly!
                </div>
              </div>

              {/* Right Paper printout */}
              <div className="flex-[0.9] flex flex-col items-center justify-center relative">
                {/* Washi tapes */}
                <div className="absolute w-[90px] h-[28px] bg-[rgba(240,235,220,0.35)] backdrop-blur-[1px] border-l-2 border-r-2 border-dashed border-black/8 top-2 left-5 -rotate-[35deg] z-10 shadow-sm"></div>
                <div className="absolute w-[90px] h-[28px] bg-[rgba(240,235,220,0.35)] backdrop-blur-[1px] border-l-2 border-r-2 border-dashed border-black/8 top-2 right-5 rotate-[38deg] z-10 shadow-sm"></div>
                <div className="absolute w-[90px] h-[28px] bg-[rgba(240,235,220,0.35)] backdrop-blur-[1px] border-l-2 border-r-2 border-dashed border-black/8 bottom-[75px] left-5 rotate-[42deg] z-10 shadow-sm"></div>
                <div className="absolute w-[90px] h-[28px] bg-[rgba(240,235,220,0.35)] backdrop-blur-[1px] border-l-2 border-r-2 border-dashed border-black/8 bottom-[75px] right-5 -rotate-[30deg] z-10 shadow-sm"></div>

                {/* The Paper Plate */}
                <div className="w-full bg-white p-6 shadow-[0_15px_40px_rgba(0,0,0,0.45),0_4px_10px_rgba(0,0,0,0.2)] rounded-[2px] -rotate-[1.5deg] flex flex-col items-center mb-[70px]">
                  <div className="w-full border-b border-[#e0e0e0] pb-2 mb-[15px] flex justify-between font-mono text-[10px] font-bold text-[#7b7b7b]">
                    <span>{project} LOGOS</span>
                    <span>FIG. 4.0</span>
                  </div>
                  <div className="w-full h-[230px] border border-white/5 bg-[#121615] flex items-center justify-center p-[10px] mb-[15px]">
                    <Image
                      src="/social/watch-alley-logo-preview.png"
                      className="max-w-full max-h-full object-contain"
                      alt="Rendered logo proof"
                      width={4500}
                      height={2250}
                      priority
                      unoptimized
                    />
                  </div>
                  <div className="text-[11px] leading-[1.4] text-[#4a4a4a] border-l-2 border-[#1c2321] pl-[10px] w-full">
                    <strong>Figure 4.0: Native Layer Render</strong>
                    The actual printed logo variations recovered directly from the raw Illustrator
                    vector path layers.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <footer className="w-full flex justify-between items-center border-t border-dashed border-white/10 pt-[20px] text-[18px]">
              <div className="text-[#f4e285]">By {author}</div>
              <div className="text-[#a8dadc]">
                PROJECT {" // "} {project}
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}
