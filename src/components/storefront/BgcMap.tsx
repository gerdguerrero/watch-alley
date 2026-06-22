/**
 * Hand-drawn isometric SVG of Bonifacio Global City, with a single gold
 * marker over the approximate Watch Alley location.
 *
 * Editorial atelier feel - closer to a sketch in a watchmaker's notebook
 * than a Google Maps screenshot. No third-party API, no JS, ~3 KB.
 *
 * Server Component.
 */
export function BgcMap() {
  return (
    <svg
      viewBox="0 0 400 300"
      role="img"
      aria-label="Bonifacio Global City, Taguig, The Watch Alley location"
      className="h-full w-full"
    >
      <title>BGC, Taguig | The Watch Alley</title>

      {/* Background tone - slightly warmer than the page bg to read as paper. */}
      <rect width="400" height="300" fill="oklch(0.16 0.014 58)" />

      {/* Block grid - thin gold rules. Streets without labels, like a
          historical map. The grid is deliberately uneven so it reads
          hand-drawn rather than CAD. */}
      <g stroke="oklch(0.76 0.12 75 / 0.16)" strokeWidth="0.8" fill="none">
        <path d="M 0 60 L 400 50" />
        <path d="M 0 100 L 400 92" />
        <path d="M 0 140 L 400 134" />
        <path d="M 0 180 L 400 178" />
        <path d="M 0 220 L 400 222" />
        <path d="M 0 260 L 400 264" />

        <path d="M 60 0 L 50 300" />
        <path d="M 120 0 L 116 300" />
        <path d="M 200 0 L 200 300" />
        <path d="M 280 0 L 286 300" />
        <path d="M 340 0 L 348 300" />
      </g>

      {/* A handful of building footprints - irregular polygons, gold-tinted. */}
      <g fill="oklch(0.76 0.12 75 / 0.10)" stroke="oklch(0.76 0.12 75 / 0.30)" strokeWidth="0.6">
        <polygon points="70,75 110,73 112,95 72,97" />
        <polygon points="130,110 175,108 178,135 132,138" />
        <polygon points="220,80 270,78 272,108 222,110" />
        <polygon points="300,150 345,148 348,178 302,180" />
        <polygon points="80,200 130,198 132,230 82,232" />
        <polygon points="220,200 275,198 278,240 222,242" />
      </g>

      {/* Bonifacio High Street axis - a thicker diagonal rule. */}
      <path
        d="M 30 250 L 380 50"
        stroke="oklch(0.76 0.12 75 / 0.45)"
        strokeWidth="1.4"
        fill="none"
        strokeDasharray="2 4"
      />

      {/* The Watch Alley marker - large gold ring with a pulse, anchored
          near the High Street line. */}
      <g transform="translate(220 140)">
        <circle r="14" fill="oklch(0.76 0.12 75 / 0.18)">
          <animate
            attributeName="r"
            values="12;20;12"
            dur="2.6s"
            repeatCount="indefinite"
            calcMode="spline"
            keySplines="0.4 0 0.2 1; 0.4 0 0.2 1"
          />
          <animate
            attributeName="opacity"
            values="0.55;0;0.55"
            dur="2.6s"
            repeatCount="indefinite"
          />
        </circle>
        <circle r="6" fill="oklch(0.76 0.12 75)" />
        <circle r="2" fill="oklch(0.13 0.012 55)" />
      </g>

      {/* Compass mark + scale - bottom right, the way old maps annotate. */}
      <g
        transform="translate(360 270)"
        stroke="oklch(0.91 0.018 78 / 0.40)"
        strokeWidth="0.8"
        fill="none"
      >
        <line x1="0" y1="-12" x2="0" y2="12" />
        <line x1="-12" y1="0" x2="12" y2="0" />
        <text
          x="0"
          y="-15"
          textAnchor="middle"
          fill="oklch(0.91 0.018 78 / 0.60)"
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: "7px",
            letterSpacing: "0.18em",
          }}
        >
          N
        </text>
      </g>

      {/* Label - Playfair italic, anchored at the marker. */}
      <text
        x="232"
        y="135"
        fill="oklch(0.91 0.018 78)"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "13px",
          fontStyle: "italic",
        }}
      >
        The Watch Alley
      </text>
      <text
        x="232"
        y="151"
        fill="oklch(0.91 0.018 78 / 0.55)"
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: "7px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        BGC · Taguig
      </text>
    </svg>
  );
}
