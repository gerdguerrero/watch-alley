const fs = require('fs');
const path = require('path');

// Extract paths from extracted-logo-black.svg
const extractedPath = '/Users/buloy/projects/watch-alley/public/brand/extracted-logo-black.svg';
const fileContent = fs.readFileSync(extractedPath, 'utf8');

// Match the exact paths from the file
// Path 1 (compass left leg & joint): index 0
// Path 2 (compass right leg / nib leaf): index 1
// Path 3 (T in THE): index 2
// Path 4 (H in THE): index 3
// Path 5 (E in THE): index 4
// Path 6 (L in LLEY): index 5
// Path 7 (L in LLEY): index 6
// Path 8 (E in LLEY): index 7
// Path 9 (Y in LLEY): index 8
// Path 10 (W in WATCH): index 9
// Path 11 (T in WATCH): index 10
// Path 12 (C in WATCH): index 11
// Path 13 (H in WATCH): index 12

// Use word boundary \b to prevent matching id="
const dRegex = /\bd="([^"]+)"/g;
const paths = [];
let match;
while ((match = dRegex.exec(fileContent)) !== null) {
  paths.push(match[1]);
}

console.log(`Extracted ${paths.length} vector paths.`);

const pathCompassLeft = paths[4];
const pathCompassRight = paths[5];
const pathTheT = paths[6];
const pathTheH = paths[7];
const pathTheE = paths[8];
const pathLleyL1 = paths[9];
const pathLleyL2 = paths[10];
const pathLleyE = paths[11];
const pathLleyY = paths[12];
const pathWatchW = paths[13];
const pathWatchT = paths[14];
const pathWatchC = paths[15];
const pathWatchH = paths[16];

// Color variables
const COLOR_GOLD = '#BD9A32';
const COLOR_CREAM = '#FFFFFF';
const COLOR_WALNUT_DEEP = '#13110f';

// 1. PRIMARY HORIZONTAL LOCKUP SVG
const primarySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 365" width="100%" height="100%">
  <g id="twa-logo">
    <!-- THE wordmark -->
    <g id="twa-the" fill="${COLOR_GOLD}">
      <path id="the-t" d="${pathTheT}" />
      <path id="the-h" d="${pathTheH}" />
      <path id="the-e" d="${pathTheE}" />
    </g>
    
    <!-- WATCH wordmark (minus A) -->
    <g id="twa-watch-w" fill="${COLOR_CREAM}">
      <path id="watch-w" d="${pathWatchW}" />
    </g>
    <g id="twa-watch-tch" fill="${COLOR_CREAM}">
      <path id="watch-t" d="${pathWatchT}" />
      <path id="watch-c" d="${pathWatchC}" />
      <path id="watch-h" d="${pathWatchH}" />
    </g>
    
    <!-- Caliper / Compass A Graphic -->
    <g id="twa-compass" fill="${COLOR_GOLD}">
      <path id="compass-left-leg" d="${pathCompassLeft}" />
      <path id="compass-right-leg" d="${pathCompassRight}" />
    </g>
    
    <!-- LLEY wordmark -->
    <g id="twa-lley" fill="${COLOR_GOLD}">
      <path id="lley-l1" d="${pathLleyL1}" />
      <path id="lley-l2" d="${pathLleyL2}" />
      <path id="lley-e" d="${pathLleyE}" />
      <path id="lley-y" d="${pathLleyY}" />
    </g>
  </g>
</svg>`;

// 2. MONOCHROME WHITE LOGO SVG
const whiteSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 365" width="100%" height="100%">
  <g id="twa-logo" fill="${COLOR_CREAM}">
    <path id="the-t" d="${pathTheT}" />
    <path id="the-h" d="${pathTheH}" />
    <path id="the-e" d="${pathTheE}" />
    <path id="watch-w" d="${pathWatchW}" />
    <path id="watch-t" d="${pathWatchT}" />
    <path id="watch-c" d="${pathWatchC}" />
    <path id="watch-h" d="${pathWatchH}" />
    <path id="compass-left-leg" d="${pathCompassLeft}" />
    <path id="compass-right-leg" d="${pathCompassRight}" />
    <path id="lley-l1" d="${pathLleyL1}" />
    <path id="lley-l2" d="${pathLleyL2}" />
    <path id="lley-e" d="${pathLleyE}" />
    <path id="lley-y" d="${pathLleyY}" />
  </g>
</svg>`;

// 3. MONOCHROME GOLD LOGO SVG
const goldSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 490 365" width="100%" height="100%">
  <g id="twa-logo" fill="${COLOR_GOLD}">
    <path id="the-t" d="${pathTheT}" />
    <path id="the-h" d="${pathTheH}" />
    <path id="the-e" d="${pathTheE}" />
    <path id="watch-w" d="${pathWatchW}" />
    <path id="watch-t" d="${pathWatchT}" />
    <path id="watch-c" d="${pathWatchC}" />
    <path id="watch-h" d="${pathWatchH}" />
    <path id="compass-left-leg" d="${pathCompassLeft}" />
    <path id="compass-right-leg" d="${pathCompassRight}" />
    <path id="lley-l1" d="${pathLleyL1}" />
    <path id="lley-l2" d="${pathLleyL2}" />
    <path id="lley-e" d="${pathLleyE}" />
    <path id="lley-y" d="${pathLleyY}" />
  </g>
</svg>`;

// 4. STANDALONE COMPASS ICON (Perfect for favicon or profile picture icon, centered in 360x360 box)
// Compass bounding box: X: 91.99 to 265.73 (width 173.74). We translate to center in 360x360 viewBox.
// Center of compass: 178.86. Target center: 180. We translate by +1.14 horizontally.
// Y range: 2.84 to 359.94 (height 357.1). Target center Y: 180.
// Current Y center: 181.39. We translate by -1.39 vertically.
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 360" width="100%" height="100%">
  <rect width="100%" height="100%" fill="none" />
  <g id="twa-compass-icon" fill="${COLOR_GOLD}" transform="translate(1.14, -1.39)">
    <path id="compass-left-leg" d="${pathCompassLeft}" />
    <path id="compass-right-leg" d="${pathCompassRight}" />
  </g>
</svg>`;

// 5. BADGE / ATELIER SEAL (Perfect circular design with outer micro bezel ring)
const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <!-- Circular deep walnut background -->
  <circle cx="256" cy="256" r="240" fill="${COLOR_WALNUT_DEEP}" stroke="${COLOR_GOLD}" stroke-width="10" />
  
  <!-- Delicate dashed inner bezel ring -->
  <circle cx="256" cy="256" r="216" fill="none" stroke="${COLOR_GOLD}" stroke-width="1.5" stroke-dasharray="4 8" opacity="0.45" />
  
  <!-- Standing Compass Icon, centered inside the 512x512 circle -->
  <!-- We want to scale the compass by 1.15 to fit nicely.
       Original compass size: 173.74 x 357.1.
       Center of original compass: (178.86, 181.39).
       We want it centered at (256, 256).
       Scale factor S = 1.12.
       New dimensions: 194.6 x 400.
       Translation TX = 256 - (178.86 * 1.12) = 256 - 200.32 = 55.68.
       Translation TY = 256 - (181.39 * 1.12) = 256 - 203.16 = 52.84.
  -->
  <g id="twa-compass-badge" fill="${COLOR_GOLD}" transform="translate(55.68, 52.84) scale(1.12)">
    <path id="compass-left-leg" d="${pathCompassLeft}" />
    <path id="compass-right-leg" d="${pathCompassRight}" />
  </g>
</svg>`;

// Write all files
fs.writeFileSync('/Users/buloy/projects/watch-alley/public/brand/twa-logo-primary.svg', primarySvg);
fs.writeFileSync('/Users/buloy/projects/watch-alley/public/brand/twa-logo-white.svg', whiteSvg);
fs.writeFileSync('/Users/buloy/projects/watch-alley/public/brand/twa-logo-gold.svg', goldSvg);
fs.writeFileSync('/Users/buloy/projects/watch-alley/public/brand/twa-logo-icon.svg', iconSvg);
fs.writeFileSync('/Users/buloy/projects/watch-alley/public/brand/twa-logo-badge.svg', badgeSvg);

console.log('Successfully generated all clean, optimized SVGs!');
