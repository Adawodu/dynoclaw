/**
 * Comic Brief template — vintage comic book newspaper layout.
 * Renders to 1400x900 (landscape comic strip format).
 * All text is real HTML/CSS — no AI text hallucination.
 * Comic feel achieved via: hand-lettered fonts, tilted panels, torn edges,
 * halftone dots, SVG section icons, and optional Gemini-generated character portrait.
 */

export interface ComicBriefSection {
  label: string; // e.g. "TECH"
  headline: string; // e.g. "AI Diagnostics Funding Surge"
  body: string; // short summary (1-2 sentences)
  icon?: "tech" | "health" | "africa" | "fintech" | "summary"; // section icon
}

export interface ComicBriefData {
  title: string; // e.g. "DAILY BRIEFING APRIL 8 2026"
  sections: ComicBriefSection[]; // 4 sections
  footer: string; // e.g. "Adebayo Dawodu | Technology Leader..."
  characterImageDataUrl?: string; // Optional base64 data URL for portrait (Gemini-generated, text-free)
  characterSpeechBubble?: string; // Optional text in character's speech bubble
  summary?: string; // Optional summary text for the summary box
}

const SECTION_COLORS = [
  { bg: "#FFD447", header: "#1a1a1a", accent: "#D97706" }, // TECH - yellow
  { bg: "#B8D4E8", header: "#1E3A5F", accent: "#1E40AF" }, // HEALTH - blue
  { bg: "#F4A460", header: "#7C2D12", accent: "#C2410C" }, // AFRICA - orange
  { bg: "#2E8B57", header: "#FDF4E1", accent: "#14532D" }, // FINTECH - green
];

// Inline SVG icons for each section (text-free, comic-styled)
const SECTION_ICONS: Record<string, string> = {
  tech: `<svg viewBox="0 0 100 100"><rect x="15" y="25" width="70" height="45" rx="3" fill="#1a1a1a" stroke="#1a1a1a" stroke-width="3"/><rect x="20" y="30" width="60" height="35" fill="#3b82f6"/><rect x="25" y="35" width="30" height="2" fill="#fbbf24"/><rect x="25" y="40" width="40" height="2" fill="#10b981"/><rect x="25" y="45" width="25" height="2" fill="#ef4444"/><rect x="25" y="50" width="35" height="2" fill="#fbbf24"/><rect x="25" y="55" width="20" height="2" fill="#10b981"/><rect x="35" y="75" width="30" height="4" fill="#1a1a1a"/><rect x="25" y="79" width="50" height="3" fill="#1a1a1a"/></svg>`,
  health: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#DC2626" stroke="#1a1a1a" stroke-width="4"/><rect x="44" y="25" width="12" height="50" fill="#FDF4E1" stroke="#1a1a1a" stroke-width="2"/><rect x="25" y="44" width="50" height="12" fill="#FDF4E1" stroke="#1a1a1a" stroke-width="2"/></svg>`,
  africa: `<svg viewBox="0 0 100 100"><path d="M 40 15 Q 55 12 68 20 Q 78 30 75 45 Q 72 60 75 72 Q 72 85 60 88 Q 50 90 45 82 Q 42 72 40 60 Q 35 50 30 40 Q 28 25 40 15 Z" fill="#F97316" stroke="#1a1a1a" stroke-width="4"/><circle cx="55" cy="40" r="3" fill="#1a1a1a"/><circle cx="50" cy="55" r="3" fill="#1a1a1a"/><circle cx="58" cy="68" r="3" fill="#1a1a1a"/></svg>`,
  fintech: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="35" fill="#FCD34D" stroke="#1a1a1a" stroke-width="4"/><text x="50" y="68" font-family="Impact" font-size="50" text-anchor="middle" fill="#1a1a1a">$</text><path d="M 15 75 L 30 55 L 45 65 L 60 40 L 75 50 L 90 25" stroke="#10b981" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><polygon points="82,25 90,25 90,33" fill="#10b981"/></svg>`,
  summary: `<svg viewBox="0 0 100 100"><path d="M 20 30 L 80 30 L 80 70 L 55 70 L 45 85 L 45 70 L 20 70 Z" fill="#FDF4E1" stroke="#1a1a1a" stroke-width="4"/><circle cx="35" cy="50" r="3" fill="#1a1a1a"/><circle cx="50" cy="50" r="3" fill="#1a1a1a"/><circle cx="65" cy="50" r="3" fill="#1a1a1a"/></svg>`,
};

const FALLBACK_CHARACTER_SVG = `data:image/svg+xml;base64,${Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">
  <defs>
    <pattern id="halftone" x="0" y="0" width="6" height="6" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1" fill="#1a1a1a" opacity="0.3"/>
    </pattern>
    <radialGradient id="bg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#FFD447"/>
      <stop offset="100%" stop-color="#D97706"/>
    </radialGradient>
  </defs>
  <rect width="300" height="300" fill="url(#bg)"/>
  <rect width="300" height="300" fill="url(#halftone)"/>
  <!-- body -->
  <path d="M 90 290 Q 90 180 150 180 Q 210 180 210 290 Z" fill="#8B4513" stroke="#1a1a1a" stroke-width="5"/>
  <path d="M 110 200 L 190 200 L 190 240 L 110 240 Z" fill="#D2691E" stroke="#1a1a1a" stroke-width="3"/>
  <!-- neck -->
  <rect x="135" y="135" width="30" height="50" fill="#3A2618" stroke="#1a1a1a" stroke-width="4"/>
  <!-- head -->
  <circle cx="150" cy="110" r="55" fill="#3A2618" stroke="#1a1a1a" stroke-width="5"/>
  <!-- hair -->
  <path d="M 105 95 Q 105 60 150 55 Q 195 60 195 95 L 180 90 Q 170 75 150 70 Q 130 75 120 90 Z" fill="#1a1a1a" stroke="#1a1a1a" stroke-width="3"/>
  <!-- eyes -->
  <ellipse cx="133" cy="108" rx="5" ry="3" fill="#FDF4E1"/>
  <ellipse cx="167" cy="108" rx="5" ry="3" fill="#FDF4E1"/>
  <circle cx="133" cy="108" r="2" fill="#1a1a1a"/>
  <circle cx="167" cy="108" r="2" fill="#1a1a1a"/>
  <!-- smile -->
  <path d="M 130 130 Q 150 145 170 130" fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round"/>
</svg>
`).toString("base64")}`;

export function renderComicBrief(data: ComicBriefData): string {
  const sections = data.sections.slice(0, 4); // cap at 4 for layout
  const characterSrc = data.characterImageDataUrl ?? FALLBACK_CHARACTER_SVG;
  const speechText =
    data.characterSpeechBubble ?? "Here's what's trending today!";
  const summaryText =
    data.summary ??
    "Stay informed. Subscribe for daily briefings on the stories that matter.";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  width: 1400px;
  height: 1000px;
  font-family: 'Impact', 'Arial Black', 'Helvetica Neue', Arial, sans-serif;
  background: #ebddbe;
  overflow: hidden;
  padding: 28px;
  position: relative;
}

/* Torn paper background with halftone */
.page {
  position: relative;
  width: 100%;
  height: 100%;
  background: #fdf4e1;
  border: 6px solid #1a1a1a;
  box-shadow:
    8px 8px 0 #1a1a1a,
    inset 0 0 60px rgba(139, 90, 43, 0.2);
  padding: 24px 32px;
  display: flex;
  flex-direction: column;
  /* Torn paper effect */
  clip-path: polygon(
    0.5% 1%, 2% 0%, 5% 0.8%, 8% 0.2%, 12% 0.9%, 15% 0.1%, 18% 0.7%,
    22% 0.2%, 26% 0.8%, 30% 0.3%, 35% 0.9%, 40% 0.2%, 45% 0.8%,
    50% 0.1%, 55% 0.9%, 60% 0.2%, 65% 0.8%, 70% 0.3%, 75% 0.9%,
    80% 0.2%, 85% 0.7%, 90% 0.1%, 95% 0.8%, 98% 0.3%, 100% 1%,
    99.5% 5%, 100% 10%, 99.3% 15%, 100% 20%, 99.5% 25%, 100% 30%,
    99.3% 35%, 100% 40%, 99.5% 45%, 100% 50%, 99.3% 55%, 100% 60%,
    99.5% 65%, 100% 70%, 99.3% 75%, 100% 80%, 99.5% 85%, 100% 90%,
    99.3% 95%, 100% 99%, 98% 100%, 95% 99.2%, 90% 99.9%, 85% 99.3%,
    80% 100%, 75% 99.2%, 70% 99.9%, 65% 99.3%, 60% 100%, 55% 99.2%,
    50% 99.9%, 45% 99.3%, 40% 100%, 35% 99.2%, 30% 99.9%, 25% 99.3%,
    20% 100%, 15% 99.2%, 10% 99.9%, 5% 99.3%, 2% 100%, 0% 99%,
    0.5% 95%, 0% 90%, 0.7% 85%, 0% 80%, 0.5% 75%, 0% 70%, 0.7% 65%,
    0% 60%, 0.5% 55%, 0% 50%, 0.7% 45%, 0% 40%, 0.5% 35%, 0% 30%,
    0.7% 25%, 0% 20%, 0.5% 15%, 0% 10%, 0.7% 5%
  );
}

/* Halftone dot overlay */
.page::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, #1a1a1a 1.2px, transparent 1.2px);
  background-size: 7px 7px;
  opacity: 0.08;
  pointer-events: none;
  z-index: 1;
}

/* Title banner - hand-lettered feel */
.title-banner {
  position: relative;
  text-align: center;
  margin-bottom: 14px;
  padding: 8px 0;
  z-index: 2;
  transform: rotate(-0.8deg);
}

.title-banner h1 {
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-size: 62px;
  font-weight: 900;
  color: #1a1a1a;
  letter-spacing: 1px;
  text-transform: uppercase;
  line-height: 0.95;
  -webkit-text-stroke: 3px #1a1a1a;
  text-shadow:
    5px 5px 0 #D97706,
    5px 5px 0 #1a1a1a;
  font-style: italic;
  display: inline-block;
  padding: 0 40px;
}

.title-banner::before,
.title-banner::after {
  content: '';
  position: absolute;
  top: 50%;
  width: 60px;
  height: 6px;
  background: #1a1a1a;
}
.title-banner::before { left: 20px; }
.title-banner::after { right: 20px; }

/* Main grid: narrower character column gives sections more room for tweet-sized body text */
.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1.3fr 0.55fr 1.3fr;
  grid-template-rows: 1fr 1fr;
  gap: 14px;
  position: relative;
  z-index: 2;
}

.character-panel {
  grid-column: 2 / 3;
  grid-row: 1 / 2;
  background: #FFD447;
  border: 5px solid #1a1a1a;
  box-shadow: 6px 6px 0 #1a1a1a;
  overflow: hidden;
  position: relative;
  transform: rotate(0.5deg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.character-panel img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: contrast(1.1) saturate(1.15);
}

.character-panel::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, #1a1a1a 1.5px, transparent 1.5px);
  background-size: 9px 9px;
  opacity: 0.18;
  pointer-events: none;
  mix-blend-mode: multiply;
}

/* Speech bubble */
.speech-bubble {
  grid-column: 2 / 3;
  grid-row: 2 / 3;
  background: #FDF4E1;
  border: 5px solid #1a1a1a;
  box-shadow: 5px 5px 0 #1a1a1a;
  padding: 16px 20px;
  position: relative;
  transform: rotate(-1deg);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 22px;
}

.speech-bubble::before {
  content: '';
  position: absolute;
  top: -22px;
  left: 40%;
  width: 0;
  height: 0;
  border-left: 20px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 22px solid #1a1a1a;
}

.speech-bubble::after {
  content: '';
  position: absolute;
  top: -14px;
  left: 42%;
  width: 0;
  height: 0;
  border-left: 15px solid transparent;
  border-right: 6px solid transparent;
  border-bottom: 16px solid #FDF4E1;
}

.speech-bubble p {
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-size: 18px;
  font-weight: 900;
  color: #1a1a1a;
  text-align: center;
  text-transform: uppercase;
  line-height: 1.15;
  letter-spacing: 0.5px;
  font-style: italic;
}

/* Section panels */
.section {
  border: 5px solid #1a1a1a;
  box-shadow: 6px 6px 0 #1a1a1a;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.section-0 { grid-column: 1 / 2; grid-row: 1 / 2; }
.section-1 { grid-column: 3 / 4; grid-row: 1 / 2; }
.section-2 { grid-column: 1 / 2; grid-row: 2 / 3; }
.section-3 { grid-column: 3 / 4; grid-row: 2 / 3; }

.section-label {
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-size: 26px;
  font-weight: 900;
  padding: 8px 20px 6px;
  letter-spacing: 2px;
  text-transform: uppercase;
  border-bottom: 4px solid #1a1a1a;
  font-style: italic;
  -webkit-text-stroke: 0.5px currentColor;
}

.section-content {
  padding: 16px 20px;
  flex: 1;
  display: flex;
  gap: 14px;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.4);
  position: relative;
}

/* Halftone dots on sections */
.section-content::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, #1a1a1a 0.9px, transparent 0.9px);
  background-size: 6px 6px;
  opacity: 0.1;
  pointer-events: none;
}

.section-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
  align-self: flex-start;
  margin-top: 2px;
}

.section-icon svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(2px 2px 0 #1a1a1a);
}

.section-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  z-index: 1;
  min-width: 0;
}

.section-headline {
  font-family: 'Impact', 'Arial Black', sans-serif;
  font-size: 22px;
  font-weight: 900;
  color: #1a1a1a;
  text-transform: uppercase;
  line-height: 1.1;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
  -webkit-text-stroke: 0.5px #1a1a1a;
}

.section-body {
  font-family: 'Georgia', 'Times New Roman', serif;
  font-size: 17px;
  color: #1a1a1a;
  line-height: 1.42;
  font-weight: 500;
}

/* Footer */
.footer {
  background: #1a1a1a;
  color: #FDF4E1;
  padding: 14px 24px;
  text-align: center;
  font-family: 'Georgia', serif;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.3px;
  margin-top: 14px;
  border: 4px solid #1a1a1a;
  box-shadow: 6px 6px 0 #D97706;
  position: relative;
  z-index: 2;
  transform: rotate(0.3deg);
}
</style>
</head>
<body>
  <div class="page">
    <div class="title-banner">
      <h1>${escape(data.title)}</h1>
    </div>

    <div class="content-grid">
      <!-- Row 1: TECH | CHARACTER | HEALTH -->
      <div class="section section-0" style="background: ${SECTION_COLORS[0].bg};">
        <div class="section-label" style="background: ${SECTION_COLORS[0].header}; color: ${SECTION_COLORS[0].bg};">${escape(sections[0]?.label || 'TECH')}</div>
        <div class="section-content">
          <div class="section-icon">${iconFor(sections[0] || { label: "TECH", headline: "", body: "" })}</div>
          <div class="section-text">
            <div class="section-headline">${escape(sections[0]?.headline || '')}</div>
            <div class="section-body">${escape(sections[0]?.body || '')}</div>
          </div>
        </div>
      </div>

      <div class="character-panel">
        <img src="${characterSrc}" alt="" />
      </div>

      <div class="section section-1" style="background: ${SECTION_COLORS[1].bg};">
        <div class="section-label" style="background: ${SECTION_COLORS[1].header}; color: ${SECTION_COLORS[1].bg};">${escape(sections[1]?.label || 'HEALTH')}</div>
        <div class="section-content">
          <div class="section-icon">${iconFor(sections[1] || { label: "HEALTH", headline: "", body: "" })}</div>
          <div class="section-text">
            <div class="section-headline">${escape(sections[1]?.headline || '')}</div>
            <div class="section-body">${escape(sections[1]?.body || '')}</div>
          </div>
        </div>
      </div>

      <!-- Row 2: AFRICA | SPEECH BUBBLE | FINTECH -->
      <div class="section section-2" style="background: ${SECTION_COLORS[2].bg};">
        <div class="section-label" style="background: ${SECTION_COLORS[2].header}; color: ${SECTION_COLORS[2].bg};">${escape(sections[2]?.label || 'AFRICA')}</div>
        <div class="section-content">
          <div class="section-icon">${iconFor(sections[2] || { label: "AFRICA", headline: "", body: "" })}</div>
          <div class="section-text">
            <div class="section-headline">${escape(sections[2]?.headline || '')}</div>
            <div class="section-body">${escape(sections[2]?.body || '')}</div>
          </div>
        </div>
      </div>

      <div class="speech-bubble">
        <p>${escape(speechText)}</p>
      </div>

      <div class="section section-3" style="background: ${SECTION_COLORS[3].bg};">
        <div class="section-label" style="background: ${SECTION_COLORS[3].header}; color: ${SECTION_COLORS[3].bg};">${escape(sections[3]?.label || 'FINTECH')}</div>
        <div class="section-content">
          <div class="section-icon">${iconFor(sections[3] || { label: "FINTECH", headline: "", body: "" })}</div>
          <div class="section-text">
            <div class="section-headline">${escape(sections[3]?.headline || '')}</div>
            <div class="section-body">${escape(sections[3]?.body || '')}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">${escape(data.footer)}</div>
  </div>
</body>
</html>`;

  function iconFor(section: ComicBriefSection): string {
    if (section.icon && SECTION_ICONS[section.icon]) return SECTION_ICONS[section.icon];
    const lower = section.label.toLowerCase();
    if (lower.includes("tech") && !lower.includes("fintech")) return SECTION_ICONS.tech;
    if (lower.includes("health")) return SECTION_ICONS.health;
    if (lower.includes("africa")) return SECTION_ICONS.africa;
    if (lower.includes("fintech") || lower.includes("money") || lower.includes("invest") || lower.includes("finance")) return SECTION_ICONS.fintech;
    return SECTION_ICONS.tech;
  }
}

function escape(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
