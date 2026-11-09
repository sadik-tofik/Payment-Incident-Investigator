# Incident Investigator · Frontend Design Notes (Step 1 Delivery)
Version: 1.0 (Sun 8 Nov / Mon 9 Nov 2026)
Reference document: `docs/05c-UI-AGENT-PROMPT-v2.md`

---

## 1. Reference Study (Part 3)

| Reference | 3 Things Done Well | 1 Thing Not To Carry Over |
|---|---|---|
| **paypal.com/us/home** | 1. **Calm trust:** Reassuring, unhurried page rhythm with generous whitespace.<br>2. **Plain language:** Direct, short sentences explaining financial actions without jargon.<br>3. **Clear primary action:** Exactly one unambiguous primary path per viewport. | **Brand identity:** Do not carry over PayPal blues, wordmarks, glyphs, or consumer marketing lifestyle photography. |
| **circle.com** | 1. **Eyebrow hierarchy:** Small, crisp uppercase eyebrow directly contextualizing declarative headlines.<br>2. **Real UI presentation:** Clean product UI cards rendered with authentic structure rather than marketing abstractions.<br>3. **Honest disclosures:** Prominent regulatory, custody, and risk disclosures anchored in the footer. | **Marketing fluff:** Do not carry over promotional logo strips, mega-menus, or speculative volume metrics. |
| **arc.io** | 1. **Documented structure:** Numbered technical markers and clear reference indexing that treat the page like an engineered document.<br>2. **Three-step linear flow:** Disciplined step-by-step technical progression.<br>3. **Typographic rigor:** Clear contrast between explanatory text and structural metadata. | **Hacker aesthetic:** Do not carry over dark-only terminal styling, curly-brace code decoration, or partner endorsement cards. |
| **solana.com** | 1. **Large confident type:** Strong visual scale that commands attention without clutter.<br>2. **Dense tabular data:** High-density factual metrics presented with crisp tabular numerals.<br>3. **Monospaced precision:** Unambiguous formatting for hashes, IDs, and cryptographic state. | **Cyberpunk aesthetics:** Do not carry over neon glowing borders, radial mesh gradients, or dark-mode-only assumptions. |
| **apple.com** | 1. **One idea per viewport:** Disciplined pacing where complex concepts are isolated and given room to breathe.<br>2. **Pacing and restraint:** Massive whitespace creating quiet dignity and intentional focus.<br>3. **Precise motion:** Subtle, scroll-anchored state transitions demonstrating mechanical function (our reference for *Two Ledgers*). | **Consumer extravagance:** Do not carry over multi-megabyte looping video backgrounds, device mockups, or hyperbolic marketing copy. |

### How Belonging Is Achieved Without Imitation
The interface feels immediately familiar to fintech and payment professionals because it adheres to established conventions:
- Standard sticky header with quiet brand mark and theme toggle.
- Tabular figures for amounts, minor units, and timestamps.
- Clear distinction between observation, derivation, and inference.
- Honest legal and privacy disclosures.
- A distinctive warm-paper default theme (`#F4F1EA`) with an ink-teal accent (`#0B5560`), balanced serif editorial headings (Newsreader), disciplined grotesk body (Hanken Grotesk), and hairline boundaries.

---

## 2. The 40-Item "Looks AI-Generated" Table (Part 2)

| # | The Tell | Rule for This Build | Implementation in `ui/` | Status |
|---|---|---|---|---|
| 1 | Harsh gradients | No gradients anywhere. Flat tonal layers only. | `tokens.css`: `--paper`, `--surface`, `--surface-2` with 1px `--hairline` borders. | Compliant |
| 2 | Lucide / stock icon library | No icon library installed or imported. | Hand-drawn SVG glyph set in `src/components/icons/` (14 glyphs, 1.5px stroke, square caps). | Compliant |
| 3 | Pure white/black backgrounds | Does not use `#FFFFFF` or `#000000`. | Light: `--paper: #F4F1EA`; Dark: `--paper: #0F1113`. | Compliant |
| 4 | Rainbow colouring | Single accent hue (`--accent`) plus ink neutrals. | Teal accent (`#0B5560` light / `#5CB3BF` dark); amber strictly for provisional/injected; error strictly for HTTP failures. | Compliant |
| 5 | Drop shadows | No `box-shadow` for elevation. | Structural separation via 1px hairlines and tonal shifts (`--surface`, `--surface-2`). Focus rings use 2px solid offset. | Compliant |
| 6 | Three feature cards in a row | Forbidden. | Numbered editorial rows with hairline dividers (`src/pages/Home.tsx` §3). | Compliant |
| 7 | Emoji | None anywhere in UI, copy, or alt text. | Strict SVG glyph set only. | Compliant |
| 8 | Liquid glass / backdrop-filter | No `backdrop-filter`, no frosted glass decoration. | Opaque surfaces without translucency (`--surface`, `--surface-2`). | Compliant |
| 9 | Em dashes | None in copy. | All prose uses commas, colons, or full stops. | Compliant |
| 10 | Inter / Geist / Space Grotesk | Banned fonts. | Self-hosted Newsreader (display serif), Hanken Grotesk (interface), IBM Plex Mono (data). | Compliant |
| 11 | Coloured left stripe on cards | Forbidden. | Frame header with glyph and text label; uniform hairline boundary. | Compliant |
| 12 | Fake testimonials / social proof | None. No quotes, avatars, or logos. | Replaced by the factual "Observed vs Injected" honesty table (`src/pages/Home.tsx` §5). | Compliant |
| 13 | Bento grids | Forbidden. | Asymmetric 12-column grid with generous reading line lengths (6–7 columns max). | Compliant |
| 14 | Fake terminal / code window mock | No terminal chrome or simulated CLI windows. | Real interactive Investigation component rendered directly from server fixtures. Mono reserved for IDs/hashes. | Compliant |
| 15 | "It's not X, it's Y" copy | Banned phrasing. | Direct, affirmative, factual statements throughout. | Compliant |
| 16 | Checkmark bullet lists | Forbidden. | Numbered sequence rows or structured definition lists (`<dl>`). | Compliant |
| 17 | Three pricing tiers | No pricing exists. | Pricing completely absent. Single open-source / hackathon diagnostic prototype. | Compliant |
| 18 | No real product demo | Faked screenshot / mockup. | Real live `Investigation` component embedded on Home page driven by real recorded fixture (`s0b-wcOrder-17`). | Compliant |
| 19 | Over-rounded / pill corners | Radius restricted to small, precise scale. | `--r-chip: 2px`, `--r-control: 4px`, `--r-panel: 6px`. Only theme toggle track is pill. | Compliant |
| 20 | Purple and black palette | Banned combinations. | Warm paper and ink-teal (`#0B5560` on `#F4F1EA`). | Compliant |
| 21 | No skeleton loaders | Blank or generic spinners. | Structural SVG/CSS skeleton layouts mirroring exact investigation cards (`src/components/SkeletonLoader.tsx`). | Compliant |
| 22 | Radial orbs / blurred blobs | None. | Scene is purely geometric, sharp, SVG/CSS 3D perspective lines. | Compliant |
| 23 | Dot grids | None. | Baseline 1px solid hairline grid inside *Two Ledgers* scene only. | Compliant |
| 24 | Sparkle icons for AI | No sparkle, magic wand, or starburst icons. | Plain text tag: "AI-rephrased from the evidence (checked against it, not guaranteed true)". | Compliant |
| 25 | Animated hover arrows | No bouncy sliding arrows. | Static underline offset on links (`text-underline-offset: 3px`). | Compliant |
| 26 | Missing Terms of Service | Omitted legal notices. | Complete Prototype Terms page (`/terms`) with explicit sandbox disclaimer. | Compliant |
| 27 | Missing Privacy Policy | Omitted data statements. | Complete Data & Privacy page (`/data`) confirming no cookies, no analytics, and no runtime third-party requests. | Compliant |
| 28 | Ubiquitous hover animations | No lift, tilt, scale, or glow on UI elements. | Color/underline transitions only (120ms linear). No translateY or scale on hover. | Compliant |
| 29 | Neon colours | None. | Muted pigment/ink palette. | Compliant |
| 30 | Basic pastel fills | No generic pastel cards. | Tinted backgrounds use low-alpha masks (6% to 10% opacity) of token hues. | Compliant |
| 31 | Centred body text | No centred reading prose. | Left-aligned typography across all pages. Only 404 and empty state prompts are centred. | Compliant |
| 32 | Homogeneous spacing | Identical margin/padding everywhere. | Disciplined rhythm scale: tight internal padding (8–24px) vs expansive section gaps (72–112px). | Compliant |
| 33 | Floating device frames | No phone/laptop mockups. | Plain web surface layout without ornamental frames. | Compliant |
| 34 | "Powered by AI" gradient badges | Forbidden. | Plain mono tag with factual status indicator: `Template` or `AI (validated)`. | Compliant |
| 35 | Stock photography / 3D blobs | Forbidden. | One functional educational diagram: *Two Ledgers* CSS/SVG scene with "Illustration of idea. Not data." caption. | Compliant |
| 36 | Generic hero + logo strip | No two-button hero or client logo bars. | Single promise headline, direct PayPal order input, case selector; no client logos. | Compliant |
| 37 | Deeply nested card boxes | Visual clutter of boxes inside boxes. | Single containment level per view; sections delineated by 1px hairlines. | Compliant |
| 38 | Fake "Live / Operational" lights | No green pulsing dots. | Footer shows exact server build version from `GET /health` and nothing else. | Compliant |
| 39 | Decorative floating numbers (01, 02) | Large faded background digits. | Numbers appear strictly to enumerate real sequences (steps 1–3, rule row 6 of 14, evidence IDs). | Compliant |
| 40 | Lorem ipsum / placeholder copy | Not allowed. | All copy is sourced verbatim from `05c-UI-AGENT-PROMPT-v2.md` blocks. | Compliant |

---

## 3. Token Contrast Table (WCAG 2.1 AA & AAA Verification)

Relative luminance calculated via `L = 0.2126*R + 0.7152*G + 0.0722*B` with standard gamma linearization. Contrast ratio formula: `(L1 + 0.05) / (L2 + 0.05)`.

### 3.1 Light Theme (`--paper`: `#F4F1EA`, `--surface`: `#FAF8F3`)

| Foreground Token | Hex | Background | Measured Ratio | WCAG AA Req (4.5:1) | WCAG AAA Req (7.0:1) | Assessment |
|---|---|---|---|---|---|---|
| `--ink` | `#16181B` | `--paper` (`#F4F1EA`) | **15.77 : 1** | Pass | Pass | Exceptional primary contrast |
| `--ink` | `#16181B` | `--surface` (`#FAF8F3`) | **17.21 : 1** | Pass | Pass | Pristine readability |
| `--ink-2` | `#3B4046` | `--paper` (`#F4F1EA`) | **9.27 : 1** | Pass | Pass | Exceeds AAA for body copy |
| `--ink-2` | `#3B4046` | `--surface` (`#FAF8F3`) | **10.12 : 1** | Pass | Pass | Exceeds AAA for body copy |
| `--muted` | `#5F656C` | `--paper` (`#F4F1EA`) | **5.22 : 1** | Pass | Large Text Only | Exceeds AA for secondary captions |
| `--muted` | `#5F656C` | `--surface` (`#FAF8F3`) | **5.70 : 1** | Pass | Large Text Only | Exceeds AA for secondary captions |
| `--accent` | `#0B5560` | `--paper` (`#F4F1EA`) | **7.50 : 1** | Pass | Pass | Exceeds AAA for interactive text |
| `--accent-ink` | `#FAF8F3` | `--accent` (`#0B5560`) | **7.97 : 1** | Pass | Pass | Exceeds AAA for button text |
| `--amber` | `#8A5A00` | `--paper` (`#F4F1EA`) | **5.25 : 1** | Pass | Large Text Only | Exceeds AA for status badges |
| `--slate` | `#46505C` | `--paper` (`#F4F1EA`) | **7.27 : 1** | Pass | Pass | Exceeds AAA for unresolved badges |
| `--error` | `#9B2C1F` | `--paper` (`#F4F1EA`) | **6.71 : 1** | Pass | Large Text Only | Exceeds AA for error alerts |

### 3.2 Dark Theme (`--paper`: `#0F1113`, `--surface`: `#16191C`)

| Foreground Token | Hex | Background | Measured Ratio | WCAG AA Req (4.5:1) | WCAG AAA Req (7.0:1) | Assessment |
|---|---|---|---|---|---|---|
| `--ink` | `#ECE9E2` | `--paper` (`#0F1113`) | **15.61 : 1** | Pass | Pass | Exceptional primary contrast |
| `--ink` | `#ECE9E2` | `--surface` (`#16191C`) | **14.28 : 1** | Pass | Pass | Pristine readability |
| `--ink-2` | `#C9C6BF` | `--paper` (`#0F1113`) | **11.09 : 1** | Pass | Pass | Exceeds AAA for body copy |
| `--muted` | `#9AA0A6` | `--paper` (`#0F1113`) | **7.17 : 1** | Pass | Pass | Exceeds AAA for dark captions |
| `--accent` | `#5CB3BF` | `--paper` (`#0F1113`) | **7.80 : 1** | Pass | Pass | Exceeds AAA for links/buttons |
| `--accent-ink` | `#0F1113` | `--accent` (`#5CB3BF`) | **7.80 : 1** | Pass | Pass | Exceeds AAA for button text |
| `--amber` | `#D9A441` | `--paper` (`#0F1113`) | **8.41 : 1** | Pass | Pass | Exceeds AAA for provisional/injected |
| `--slate` | `#9FB0C2` | `--paper` (`#0F1113`) | **8.53 : 1** | Pass | Pass | Exceeds AAA for unresolved badges |
| `--error` | `#E58A7C` | `--paper` (`#0F1113`) | **7.44 : 1** | Pass | Pass | Exceeds AAA for error panels |

---

## 4. Implementation Readiness & Boundaries
1. **Self-Hosted Fonts:** WOFF2 files for Newsreader, Hanken Grotesk, and IBM Plex Mono will be placed in `ui/public/fonts/` with `LICENSES.txt`. No external Google Fonts or Typekit CDN links.
2. **No Third-Party Runtime Calls:** Strict Content Security Policy meta tag will be baked into `ui/index.html`. No analytics, tracking, or CDN script imports.
3. **Question Files:**
   - `ui/COPY-QUESTIONS.md` initialized (no copy discrepancies identified; all copy matches `docs/05c-UI-AGENT-PROMPT-v2.md`).
   - `ui/CONTRACT-QUESTIONS.md` initialized (contract v1.0 covers all necessary states and fixtures).
