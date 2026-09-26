const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createSocialPreviewCard() {
  const width = 1200;
  const height = 630;

  // Read logo if exists
  let logoBase64 = '';
  const logoPath = path.join(__dirname, '../public/logo.png');
  if (fs.existsSync(logoPath)) {
    const logoBuffer = fs.readFileSync(logoPath);
    logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
  }

  // Read vet photo
  const photoPath = '/tmp/vet_hero.jpg';
  let photoBuffer;
  if (fs.existsSync(photoPath)) {
    // Resize photo to 430x490 with rounded corners
    const photoWidth = 430;
    const photoHeight = 490;
    const roundedCornersMask = Buffer.from(
      `<svg><rect x="0" y="0" width="${photoWidth}" height="${photoHeight}" rx="24" ry="24" /></svg>`
    );
    photoBuffer = await sharp(photoPath)
      .resize(photoWidth, photoHeight, { fit: 'cover', position: 'top' })
      .composite([{ input: roundedCornersMask, blend: 'dest-in' }])
      .toFormat('png')
      .toBuffer();
  }

  const photoBase64 = photoBuffer ? `data:image/png;base64,${photoBuffer.toString('base64')}` : '';

  // SVG representation for the social preview card
  const svg = `
  <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <!-- Background Gradient -->
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0b1714" />
        <stop offset="45%" stop-color="#11221e" />
        <stop offset="100%" stop-color="#0a1210" />
      </linearGradient>

      <!-- Glow radial gradient -->
      <radialGradient id="greenGlow" cx="20%" cy="30%" r="50%">
        <stop offset="0%" stop-color="#22c55e" stop-opacity="0.18" />
        <stop offset="100%" stop-color="#22c55e" stop-opacity="0" />
      </radialGradient>
      
      <radialGradient id="amberGlow" cx="80%" cy="80%" r="50%">
        <stop offset="0%" stop-color="#eab308" stop-opacity="0.12" />
        <stop offset="100%" stop-color="#eab308" stop-opacity="0" />
      </radialGradient>

      <!-- Card gradient -->
      <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#162c26" stop-opacity="0.85" />
        <stop offset="100%" stop-color="#0f201b" stop-opacity="0.95" />
      </linearGradient>

      <linearGradient id="goldText" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fde047" />
        <stop offset="100%" stop-color="#ca8a04" />
      </linearGradient>

      <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
        <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.6" />
      </filter>
      
      <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.4" />
      </filter>
    </defs>

    <!-- Main Background -->
    <rect width="${width}" height="${height}" fill="url(#bgGrad)" />
    
    <!-- Ambient Lighting -->
    <circle cx="200" cy="200" r="450" fill="url(#greenGlow)" />
    <circle cx="1000" cy="500" r="400" fill="url(#amberGlow)" />

    <!-- Subtle Medical Grid lines -->
    <g stroke="rgba(255,255,255,0.03)" stroke-width="1">
      <line x1="0" y1="120" x2="1200" y2="120" />
      <line x1="0" y1="240" x2="1200" y2="240" />
      <line x1="0" y1="360" x2="1200" y2="360" />
      <line x1="0" y1="480" x2="1200" y2="480" />
      <line x1="200" y1="0" x2="200" y2="630" />
      <line x1="400" y1="0" x2="400" y2="630" />
      <line x1="600" y1="0" x2="600" y2="630" />
      <line x1="800" y1="0" x2="800" y2="630" />
      <line x1="1000" y1="0" x2="1000" y2="630" />
    </g>

    <!-- Outer card border -->
    <rect x="2" y="2" width="1196" height="626" rx="0" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="2" />

    <!-- Top Left Brand Badge & Logo -->
    <g transform="translate(60, 52)">
      <!-- Logo circle background -->
      <rect x="0" y="0" width="68" height="68" rx="20" fill="#1b362f" stroke="#2a5247" stroke-width="2" filter="url(#badgeShadow)" />
      ${logoBase64 ? `
        <image href="${logoBase64}" x="6" y="6" width="56" height="56" />
      ` : `
        <!-- Fallback Medical Cross + Paw Icon -->
        <rect x="30" y="16" width="8" height="36" rx="3" fill="#4ade80" />
        <rect x="16" y="30" width="36" height="8" rx="3" fill="#4ade80" />
      `}
      
      <!-- Brand Name -->
      <text x="84" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="34" font-weight="900" fill="#ffffff" letter-spacing="-0.5">
        VetAxis <tspan fill="#4ade80">360</tspan>
      </text>

      <!-- Pill Badge: Verified Clinical Network -->
      <g transform="translate(84, 46)">
        <rect x="0" y="0" width="220" height="22" rx="11" fill="rgba(34, 197, 94, 0.15)" stroke="rgba(34, 197, 94, 0.4)" stroke-width="1" />
        <circle cx="12" cy="11" r="4" fill="#22c55e" />
        <text x="24" y="15" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="800" fill="#86efac" letter-spacing="0.4">
          VERIFIED VETERINARY NETWORK
        </text>
      </g>
    </g>

    <!-- Main Headline Text -->
    <g transform="translate(60, 175)">
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" font-size="44" font-weight="900" fill="#ffffff" letter-spacing="-1">
        Premier Veterinary Care
      </text>
      <text x="0" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif" font-size="44" font-weight="900" fill="url(#goldText)" letter-spacing="-1">
        &amp; 24/7 Emergency Animal Clinics
      </text>
      <text x="0" y="96" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="500" fill="#cbd5e1" letter-spacing="0.1">
        Connecting pet owners with verified DVMs, walk-in clinics &amp; clinical diagnostics.
      </text>
    </g>

    <!-- 4 Feature Value Badges (2 x 2 layout) -->
    <g transform="translate(60, 315)">
      <!-- Feature 1: Emergency -->
      <g transform="translate(0, 0)">
        <rect x="0" y="0" width="280" height="66" rx="16" fill="rgba(239, 68, 68, 0.12)" stroke="rgba(239, 68, 68, 0.3)" stroke-width="1.2" />
        <text x="20" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="19">🚨</text>
        <text x="50" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" font-weight="800" fill="#fca5a5">24/7 Emergency Care</text>
        <text x="50" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="12" font-weight="500" fill="#cbd5e1">Open Now &amp; Walk-Ins (No Appt)</text>
      </g>

      <!-- Feature 2: Verified DVM Doctors -->
      <g transform="translate(300, 0)">
        <rect x="0" y="0" width="280" height="66" rx="16" fill="rgba(34, 197, 94, 0.12)" stroke="rgba(34, 197, 94, 0.3)" stroke-width="1.2" />
        <text x="20" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="19">🩺</text>
        <text x="50" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" font-weight="800" fill="#86efac">Qualified DVM Doctors</text>
        <text x="50" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="12" font-weight="500" fill="#cbd5e1">Specialists, Surgeons &amp; Home Visits</text>
      </g>

      <!-- Feature 3: Animal Clinics & ICU -->
      <g transform="translate(0, 80)">
        <rect x="0" y="0" width="280" height="66" rx="16" fill="rgba(56, 189, 248, 0.12)" stroke="rgba(56, 189, 248, 0.3)" stroke-width="1.2" />
        <text x="20" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="19">🏥</text>
        <text x="50" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" font-weight="800" fill="#7dd3fc">Hospitals &amp; Diagnostics</text>
        <text x="50" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="12" font-weight="500" fill="#cbd5e1">Digital X-Ray, Ultrasound &amp; Labs</text>
      </g>

      <!-- Feature 4: Ethical Adoption & Direct Supplies -->
      <g transform="translate(300, 80)">
        <rect x="0" y="0" width="280" height="66" rx="16" fill="rgba(245, 158, 11, 0.12)" stroke="rgba(245, 158, 11, 0.3)" stroke-width="1.2" />
        <text x="20" y="30" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="19">🐾</text>
        <text x="50" y="28" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="14" font-weight="800" fill="#fde68a">Pet Adoption &amp; Supplies</text>
        <text x="50" y="48" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="12" font-weight="500" fill="#cbd5e1">Vaccines, Medicine &amp; Supplies</text>
      </g>
    </g>

    <!-- Bottom Authority & URL Bar -->
    <g transform="translate(60, 520)">
      <line x1="0" y1="0" x2="580" y2="0" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
      
      <!-- Domain link -->
      <g transform="translate(0, 22)">
        <circle cx="12" cy="12" r="12" fill="#1b362f" />
        <text x="7" y="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="13" fill="#4ade80">🌐</text>
        <text x="32" y="17" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="800" fill="#ffffff" letter-spacing="0.5">
          vetaxis360.com
        </text>
      </g>

      <!-- Rating trust score -->
      <g transform="translate(320, 22)">
        <text x="0" y="17" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#fde047">
          ⭐ 4.9/5 <tspan font-weight="500" fill="#94a3b8">(5,200+ Verified Reviews)</tspan>
        </text>
      </g>
    </g>

    <!-- Right Column: Card with Photograph & Interactive Badges -->
    <g transform="translate(705, 52)" filter="url(#shadow)">
      <!-- Outer Card container -->
      <rect x="0" y="0" width="440" height="526" rx="26" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="2" />
      
      ${photoBase64 ? `
        <!-- Vet and Pet Photo -->
        <g transform="translate(6, 6)">
          <image href="${photoBase64}" x="0" y="0" width="428" height="514" preserveAspectRatio="xMidYMid slice" />
          <!-- Dark overlay gradient for contrast -->
          <rect x="0" y="280" width="428" height="234" rx="20" fill="url(#bgGrad)" opacity="0.88" />
        </g>
      ` : `
        <rect x="6" y="6" width="428" height="514" rx="20" fill="#122520" />
      `}

      <!-- Top Right Floating Status Pill: OPEN 24/7 -->
      <g transform="translate(260, 24)" filter="url(#badgeShadow)">
        <rect x="0" y="0" width="150" height="36" rx="18" fill="#b91c1c" stroke="#f87171" stroke-width="1.5" />
        <circle cx="18" cy="18" r="5" fill="#ffffff" />
        <text x="32" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="900" fill="#ffffff" letter-spacing="0.5">
          🚨 24/7 OPEN NOW
        </text>
      </g>

      <!-- Bottom Card Overlay Info -->
      <g transform="translate(24, 380)" filter="url(#badgeShadow)">
        <rect x="0" y="0" width="392" height="120" rx="20" fill="rgba(11, 23, 20, 0.9)" stroke="rgba(255, 255, 255, 0.18)" stroke-width="1.5" />
        
        <!-- Doctor & Clinic Avatar Badge -->
        <circle cx="40" cy="42" r="24" fill="#1b362f" stroke="#4ade80" stroke-width="2" />
        <text x="28" y="49" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22">👩‍⚕️</text>
        
        <text x="76" y="34" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="900" fill="#ffffff">
          Emergency Clinical Triage
        </text>
        <text x="76" y="54" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="#86efac">
          ✓ Verified DVM On-Call • Instant Booking
        </text>
        
        <!-- Star rating row -->
        <g transform="translate(24, 76)">
          <rect x="0" y="0" width="344" height="30" rx="10" fill="rgba(255, 255, 255, 0.06)" />
          <text x="14" y="20" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="12" fill="#fbbf24">
            ⭐⭐⭐⭐⭐ <tspan fill="#ffffff" font-weight="800">Top-Rated Veterinary Platform</tspan>
          </text>
        </g>
      </g>
    </g>
  </svg>
  `;

  // Render SVG to 1200x630 PNG and JPEG
  const pngPath = path.join(__dirname, '../public/og-image.png');
  const jpgPath = path.join(__dirname, '../public/og-image.jpg');
  const svgPath = path.join(__dirname, '../public/og-image.svg');

  fs.writeFileSync(svgPath, svg.trim());
  console.log('Saved SVG to:', svgPath);

  await sharp(Buffer.from(svg))
    .png({ quality: 95, compressionLevel: 8 })
    .toFile(pngPath);
  console.log('Generated PNG at:', pngPath, 'Size:', fs.statSync(pngPath).size);

  await sharp(Buffer.from(svg))
    .jpeg({ quality: 90 })
    .toFile(jpgPath);
  console.log('Generated JPG at:', jpgPath, 'Size:', fs.statSync(jpgPath).size);
}

createSocialPreviewCard().catch(err => {
  console.error('Failed to create preview card:', err);
  process.exit(1);
});
