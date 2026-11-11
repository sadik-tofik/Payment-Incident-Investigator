# 05c · UI-agent prompt v2 (design edition)
Version 2.0 DRAFT, Sun 8 Nov 2026. Supersedes the look-and-feel parts of `05b-UI-AGENT-PROMPT.md`. The **behavioural rules, screens and acceptance checklist in 05b and the API contract `05a-API-CONTRACT.md` stay in force**; this file adds the full visual system, every page, every state and all public copy.

Give the frontend agent: this file, `05a-API-CONTRACT.md`, `05b-UI-AGENT-PROMPT.md`, and the folder `docs/ui-fixtures/` (17 real responses).

Reading order for you (the agent): Part 0 (rules that override everything), Part 1 (what this product is), Part 2 (what to avoid), Part 3 (references), then Parts 4 to 8 (system), 9 to 14 (pages), 15 to 17 (states, a11y, build), 18 (delivery).

---
# PART 0. RULES THAT OVERRIDE EVERYTHING ELSE
These exist because the owner lost a past competition on a claim that could not be proven. A beautiful page that says something false is a failed page.

0.1 **Honesty beats polish.** Nothing on screen may suggest more than the evidence supports. If a design idea needs a fake number, a fake status light, a fake customer, a fake testimonial, a fake logo strip, a fake live feed, a fake price or a fake "system operational" indicator, drop the idea.
0.2 **All public copy is supplied in this file** (Parts 9 to 14, blocks marked `COPY`). Use it verbatim. Do not write marketing copy of your own. If a screen needs a string that is not supplied, add it to `ui/COPY-QUESTIONS.md` with the screen, the string you propose and why, and use a neutral placeholder label until the owner answers. Strings that come from the API are shown verbatim as the contract says.
0.3 **Forbidden words in your own copy** (an automated check will fail the build): guarantee, guarantees, guaranteed, prevent, prevents, prevented, eliminate, eliminates, eliminated, zero, autonomous, autonomously, always, never, fully, instantly, root cause, caused by, production-ready, production readiness, tamper-proof, reconciles, recovers stuck, AI finds, 100%, real-time, validated by. Also never write "AI-powered", "smart", "intelligent", "seamless", "effortless", "revolutionary", "next-generation" or any similar adjective. A negated use inside a supplied COPY block is allowed; you add none of your own.
0.4 **Nothing executes.** No control anywhere may look like it approves, captures, marks paid, refunds, retries, repairs, edits or fixes. Suggestions from `actions.safe[]` are plain text for a person (`humanActionOnly: true`). No accounts, login, search across orders, stuck-order lists, webhook screens, pricing, plans, sign-up, waitlist or contact forms.
0.5 **Source label on every investigation, always visible**, and injected cases must be unmistakable (Part 6.7).
0.6 **Identity is never overstated.** Confirmed, provisional association and unresolved must look different, and provisional shows its full notice in the open.
0.7 **Unknown, abstain and any identity other than confirmed are findings**: neutral styling, never red, never green, never the word "error" or "failed".
0.8 **Errors never show a verdict.** A non-200 response has no decision.
0.9 **No third-party requests at runtime.** Self-host fonts and every asset. No analytics, no tracking, no embeds, no CDN scripts. (The Data notice in Part 13 states this; it must be true. Verify in the browser network panel and report the result.)
0.10 **No impersonation.** Do not use the PayPal, WooCommerce, Circle, Arc, Solana, Apple or any other company's logo, wordmark, colour set, iconography, typeface or layout copy. This product has its own identity. The words "PayPal" and "WooCommerce" appear only as plain text naming the systems being read. The footer carries the non-affiliation line in Part 14.
0.11 **Build only against the locked contract.** Do not invent fields, routes or states. Missing something? Write it in `ui/CONTRACT-QUESTIONS.md`.
0.12 **Do not copy anything from the example prompts the owner attached** that conflicts with these rules. Specifically ignore their fake "System Operational" status, fake stats, pricing tiers, testimonials, grain/noise overlays, glass effects, neon palettes, spinning conic-gradient buttons, custom cursors, magnetic buttons, giant background text and parallax image stacks. Take only the *craft* lessons: strong typographic contrast, deliberate pacing, one memorable visual idea, precise motion.

---
# PART 1. WHAT THIS PRODUCT IS
**Name on screen:** "Incident Investigator" (working title; keep it easy to change in one constants file). Tagline: none.

**One-line promise** (also the structure of the first thing visitors read): *Give it a PayPal order ID. It reads that order from PayPal and the matching order from WooCommerce, shows what each system says, says whether it can link them and where they disagree (or that it cannot tell), and lists which next steps are safe and which are forbidden. It changes nothing in either system.*

**What it is, in plain terms.** A merchant's WooCommerce store and PayPal can hold two different stories about one payment. This prototype reads both for one order, lines them up, and states, with evidence, what agrees, what disagrees, and what it cannot know. It never fixes anything. A human decides.

**Who looks at the UI.**
1. **Hackathon judges** (first, and for about three minutes). They need to understand the idea in ten seconds, see a real-looking tool in use, and trust that nothing is faked. They will also check whether the UI is honest about what is real and what is injected.
2. **The owner**, recording a demo video. Every screen must be clean enough to record without hiding anything.
3. **A hypothetical merchant or support person.** Not a real user yet: no merchant has tested this. Design for a careful, slightly anxious operator who wants to know "can I trust this answer, and what should I do next?"

**Tone of the interface.** Plain, calm, exact, a little dry. It reads like a good incident report written by a careful engineer, not like marketing. Short sentences. No hype. No exclamation marks. No emoji. No em dashes (use a comma, a colon or a full stop). No "it is not X, it is Y" constructions.

**The feeling to aim for.** Someone opens this and feels they are inside a serious payments tool: quiet confidence, precise typography, generous space, real data shown with care. It should feel like it could sit next to the best fintech product pages (see Part 3) while having its own identity, and it must ship a polished **light theme as the default** (dark is a full second theme, not an afterthought).

**What is real in this build (so you never imply more).**
* Real: the decision engine, evidence handling, hashes, the audit chain, three recorded real sandbox orders replayed from files.
* Injected: three cases written by the owner to exercise rules, always labelled.
* Not built: live reads, fixing orders, capturing payments, refunds, approvals, merchant testing. AI explanations are an optional adapter that is off by default; it was run against a real model on two recorded cases (see docs/evidence/AI-RUN-2026-11-11.md) and the UI must label any AI text as validated rewording.

---
# PART 2. THE "LOOKS AI-GENERATED" LIST: WHAT TO DO INSTEAD
The owner's list of 30 tells, plus ones a senior designer adds. For each: the rule, and the replacement. Treat every item as a hard requirement. In `ui/DESIGN-NOTES.md` include a table showing, per item, where in the build it is satisfied.

| # | The tell | Rule for this build | Use instead |
|---|---|---|---|
| 1 | Harsh gradients | No gradients anywhere, including text and buttons. One exception: a 1px hairline fade on the hero scene edge. | Flat tonal layers: paper, surface, surface-2, separated by hairlines. |
| 2 | Lucide icons (and any stock set) | No icon library. | A small custom glyph set drawn by you (Part 5.6): 1.5px stroke, square caps, 20px grid, 14 glyphs. |
| 3 | Pure white background | Never `#FFFFFF` and never `#000000`. | Warm paper `#F4F1EA`; dark theme `#0F1113`. |
| 4 | Rainbow colouring | One accent hue plus ink neutrals. Status is shown by glyph shape and label first, colour second. | Tokens in Part 4. |
| 5 | Drop shadows | No `box-shadow` for elevation. | 1px borders, tonal surfaces, and a 2px offset focus ring. |
| 6 | Three feature cards in a row | Forbidden. | An editorial numbered list with hairline rules (Part 9.3). |
| 7 | Emoji | None, anywhere, including copy and alt text. | Glyphs from the custom set. |
| 8 | "Liquid glass" | No `backdrop-filter`, no translucency for decoration. | Opaque surfaces. |
| 9 | Em dashes | None in copy. | Comma, colon, full stop. |
| 10 | Inter / Geist / Space Grotesk | Not used. | Newsreader (display serif), Hanken Grotesk (UI), IBM Plex Mono (data). Self-hosted. |
| 11 | Coloured left stripe on cards | Forbidden. | A glyph + label in the card header; hairline frame. |
| 12 | Fake testimonials | None. No quotes, avatars or "trusted by". | Nothing. The honesty table replaces social proof (Part 9.5). |
| 13 | Bento grids | Forbidden. | A 12-column grid with deliberate asymmetric column spans and long lines of reading text. |
| 14 | Terminal window mock | No fake terminal or code window. | Real components rendered from fixtures. Mono is only for IDs, hashes, field names. |
| 15 | "It's not X, it's Y" | Banned in all copy. | Plain statements. |
| 16 | Checkmark bullet lists | Forbidden. | Numbered rows with hairlines, or definition lists. |
| 17 | Three pricing tiers | There is no pricing. | Nothing. |
| 18 | No real product demo | The home page embeds the **real** Investigation component driven by a recorded fixture, interactive. | Part 9.4. |
| 19 | Soft, over-rounded corners | Radius is small and consistent: 2px chips, 4px controls, 6px panels. No pill shapes except the theme switch. | Part 5.3. |
| 20 | Purple and black | Neither as brand. | Ink-teal accent on warm paper. |
| 21 | No skeleton loaders | Every async view has a skeleton shaped like the real layout. | Part 15.1. |
| 22 | Radial orbs / blurred blobs | None. | The Two Ledgers scene (Part 8) is geometric and sharp. |
| 23 | Dot grids | None. | A 1px hairline baseline grid only in the Two Ledgers scene, drawn as lines. |
| 24 | Sparkle icons | None, and none for AI. | AI text is labelled in words (Part 12.7). |
| 25 | Animated arrows | None. | Static underline offsets on links. |
| 26 | No terms of service | There is a Terms page. | Part 13.2. |
| 27 | No privacy policy | There is a Data and privacy page. | Part 13.1. |
| 28 | Hover animations everywhere | Hover changes colour or underline only. No lift, scale, glow or tilt on any UI control. | State changes 120 ms. |
| 29 | Neon colours | None. | Muted, ink-based palette. |
| 30 | Basic pastels | None. Tints are the accent at 6 to 10 percent alpha, not pastel fills. | Part 4.2. |
| 31 | Everything centred | Left-aligned reading layouts. Centre only the 404 and empty states. | Part 5.1. |
| 32 | Same spacing everywhere | Use the rhythm scale in Part 5.2: tight inside components, very open between sections. | Part 5.2. |
| 33 | Floating app mockup with fake data | No device frames, no invented numbers. | Real components. |
| 34 | "Powered by AI" badges and gradient chips | None. | Part 12.7. |
| 35 | Stock photography and 3D blobs | None. | One purposeful geometric 3D scene (Part 8). |
| 36 | Generic hero line + two buttons + logo strip | The hero carries the promise sentence; no logo strip. | Part 9.1. |
| 37 | Cards inside cards inside cards | One level of containment per view. | Hairline sections, not nested boxes. |
| 38 | Fake "live" or "operational" status | Nothing claims to be live. | The footer shows the build version from `GET /health` and nothing else. |
| 39 | Dribbble-style decorative numbers (large faded 01 02 03) | Numbers appear only where they number real things (steps, evidence IDs). | Part 9.3, Part 10. |
| 40 | Lorem ipsum or "Feature one" | Never. | Supplied copy only. |

---
# PART 3. REFERENCES: WHAT TO LEARN, WHAT NOT TO COPY
Before designing, open these in a browser and write `ui/DESIGN-NOTES.md` (one page): for each, three things done well and one thing not to carry over. **Study structure and craft, never copy identity.** Do not use their logos, colours, copy, illustrations or layouts.

* **paypal.com/us/home**: calm trust, very plain language, strong typographic hierarchy, restrained colour, generous space, clear primary action. *Do not use PayPal's blues, logo, wordmark or product imagery.*
* **circle.com**: a small uppercase eyebrow above a short, declarative headline; product UI shown as real UI; filterable cards; a footer that carries honest regulatory and risk disclosures; a stats row. *Do not carry over the mega-menu, the logo strip or any marketing stats.*
* **arc.io**: numbered references and labelled section markers that make a page feel like an engineered document; a clear three-step flow. *Do not carry over the terminal-flavoured braces, the dark hero or the partner and quote cards.*
* **solana.com**: confident large type and dense, readable data presentation. *Do not carry over neon gradients.*
* **apple.com** (and samsung.com for contrast): one idea per viewport, very large type, product-first imagery, precise motion tied to scroll, very restrained palette, enormous whitespace. This is the model for pacing and for the 3D scene in Part 8. *Do not carry over product photography or hero video.*

**How "belonging" is achieved without imitation.** A visitor who works in payments should feel at home because the *conventions* are familiar: a simple sticky header, one clear primary action, plain language, tabular numerals, a trust-and-legal footer, visible status labels, no surprises. The identity is different: warm paper, ink-teal, an editorial serif, hairline construction, and a signature 3D scene that explains the product's one idea. The owner wants it **better and unique, and with a real light mode**, which the reference sites lack.

---
# PART 4. COLOUR
Define every colour as a CSS custom property on `:root`. Dark values are redefined under `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])` and again under `:root[data-theme="dark"]`. Default: follow the system; a visible theme switch overrides and is remembered in `localStorage` (wrapped in try/catch; the page works without it). Never hard-code a colour outside the token file.

## 4.1 Light theme (default)
| Token | Hex | Use |
|---|---|---|
| `--paper` | `#F4F1EA` | Page background (a warm off-white; never pure white) |
| `--surface` | `#FAF8F3` | Panels and the investigation sheet |
| `--surface-2` | `#EDE9DF` | Table header rows, code and hash wells, skeleton base |
| `--ink` | `#16181B` | Headings and primary text |
| `--ink-2` | `#3B4046` | Body text |
| `--muted` | `#5F656C` | Secondary text, captions (contrast 5.1:1 on paper) |
| `--hairline` | `rgba(22,24,27,0.14)` | 1px rules and borders |
| `--hairline-strong` | `rgba(22,24,27,0.32)` | Input borders, focus-adjacent rules |
| `--accent` | `#0B5560` | Links, primary button, "observed" evidence, confirmed identity (7.6:1 on paper) |
| `--accent-ink` | `#FAF8F3` | Text on accent fills |
| `--accent-tint` | `rgba(11,85,96,0.07)` | Hover and selected backgrounds |
| `--amber` | `#8A5A00` | Provisional identity, inference, injected band (5.0:1 on paper) |
| `--amber-tint` | `rgba(138,90,0,0.09)` | Provisional and injected backgrounds |
| `--slate` | `#46505C` | Unresolved identity, declared items |
| `--slate-tint` | `rgba(70,80,92,0.08)` | Unresolved background |
| `--error` | `#9B2C1F` | **Only** the HTTP error panel and form errors. Never a verdict. |
| `--error-tint` | `rgba(155,44,31,0.07)` | Error panel background |

## 4.2 Dark theme
| Token | Hex |
|---|---|
| `--paper` | `#0F1113` |
| `--surface` | `#16191C` |
| `--surface-2` | `#1E2226` |
| `--ink` | `#ECE9E2` |
| `--ink-2` | `#C9C6BF` |
| `--muted` | `#9AA0A6` |
| `--hairline` | `rgba(236,233,226,0.14)` |
| `--hairline-strong` | `rgba(236,233,226,0.34)` |
| `--accent` | `#5CB3BF` |
| `--accent-ink` | `#0F1113` |
| `--accent-tint` | `rgba(92,179,191,0.10)` |
| `--amber` | `#D9A441` |
| `--amber-tint` | `rgba(217,164,65,0.12)` |
| `--slate` | `#9FB0C2` |
| `--slate-tint` | `rgba(159,176,194,0.10)` |
| `--error` | `#E58A7C` |
| `--error-tint` | `rgba(229,138,124,0.10)` |

## 4.3 Colour rules
* Contrast: text at least 4.5:1, large text and UI boundaries at least 3:1 in both themes. Run an automated check on every token pair and include the table in `ui/DESIGN-NOTES.md`.
* **Colour is never the only signal.** Every status pairs a glyph shape, a text label and a colour.
* The accent is used sparingly: links, the single primary button per view, selected states, observed evidence, confirmed identity. It must not appear as a large fill except the primary button.
* Green is not in the palette. Nothing in this product is "success". The `ok` verdict is shown in ink with a plain statement, not a green tick.
* Red is not in the palette except `--error`, used only on the HTTP error panel and on invalid form input.

---
# PART 5. TYPE, SPACE, SHAPE, ICONS
## 5.1 Typefaces (self-host WOFF2 from the Google Fonts repositories under their open licences; include `ui/public/fonts/LICENSES.txt`)
* **Display:** Newsreader (variable, optical size axis). Used for H1 and H2 only. Weight 400 to 500. Tracking `-0.015em`. Never italic for emphasis in headings except once per page in the hero.
* **Interface and body:** Hanken Grotesk (variable). Weights 400, 500, 600.
* **Data:** IBM Plex Mono. Weights 400 and 500. Used for order IDs, evidence IDs, hashes, field names, timestamps. Always `font-variant-numeric: tabular-nums`.
* Fallbacks: `Georgia, "Times New Roman", serif`; `system-ui, sans-serif`; `ui-monospace, Menlo, monospace`. Use `font-display: swap` with `size-adjust` to avoid layout shift.
* No other typefaces. No Inter, Geist, Space Grotesk, Roboto, Poppins or system-default look-alikes.

## 5.2 Scale and rhythm
| Role | Size / line height (desktop ≥1024) | Mobile (360) | Face | Notes |
|---|---|---|---|---|
| Display (home H1) | 64 / 68 | 40 / 44 | Newsreader 400 | max 14 characters per line target ~ 11 ch; wrap by design |
| H1 (page) | 44 / 50 | 32 / 38 | Newsreader 400 | |
| H2 | 30 / 38 | 24 / 32 | Newsreader 500 | |
| H3 | 20 / 28 | 18 / 26 | Hanken 600 | |
| Lead | 20 / 32 | 18 / 28 | Hanken 400 | max line length 62ch |
| Body | 16 / 26 | 16 / 26 | Hanken 400 | max line length 68ch |
| Small | 14 / 22 | 14 / 22 | Hanken 400 | |
| Caption / eyebrow | 12 / 16, uppercase, tracking `0.08em` | same | Hanken 600 | |
| Data | 13 / 20 | 13 / 20 | Plex Mono 400 | |

Spacing scale (px): 4, 8, 12, 16, 24, 32, 48, 72, 112, 160. Inside components use 8 to 24. Between page sections use 112 (desktop) or 72 (mobile); between a section heading and its body use 24. Vary the rhythm: dense data blocks, then very open reading blocks. Never use the same gap between everything.

Layout: 12-column grid, 1200 px max container, 24 px gutters (16 on mobile), 24 px side margins (16 on mobile). Reading text spans 6 to 7 columns, never the full width. Use asymmetry: for example text in columns 1 to 6 and the scene in 7 to 12, or a narrow label column (1 to 3) beside a wide content column (4 to 12). Left-align almost everything.

## 5.3 Shape
* Radius: `--r-chip: 2px`, `--r-control: 4px`, `--r-panel: 6px`. No larger radius anywhere. Only the theme switch track may be a pill.
* Borders: 1px `--hairline` for structure; 1px `--hairline-strong` for inputs; 2px `--accent` focus ring with 2px `--paper` offset.
* No shadows, no blur, no glow, no gradient, no translucency for decoration.
* Hairline rules between list rows; no zebra striping except evidence tables (surface-2 on odd rows).

## 5.4 Buttons and links
* **Primary button:** `--accent` fill, `--accent-ink` text, 44 px high, 20 px side padding, radius 4, Hanken 600 16. Hover: fill moves to `--ink` (120 ms colour only). One primary per view.
* **Secondary button:** 1px `--hairline-strong` border, `--ink` text, transparent fill. Hover: `--accent-tint` fill.
* **Text link:** `--accent`, underline 1px with 3px offset, thickness 2px on hover. External links get a small glyph and `rel="noopener"`.
* **Disabled:** 45 percent opacity text, no pointer, still readable.
* No icon-only buttons except the theme switch and the evidence drawer close, which carry `aria-label`.
* No arrow animations, no sliding fills, no magnetic effects.

## 5.5 Form controls
* Text input: 48 px high, 1px `--hairline-strong`, radius 4, `--surface` fill, mono face for IDs. Visible label above (never placeholder-only). Helper text below in `--muted`. Error text in `--error` with a glyph, never colour alone.
* Format hint for PayPal order ID is shown as helper text and is client-side only; the server validates.

## 5.6 Custom glyph set (draw these as inline SVG; 20 x 20 grid, 1.5px stroke, square caps, mitre joins, `currentColor`)
Provide each at 16, 20 and 24 px. Names: `observed` (filled circle), `derived` (diamond), `inferred` (half-filled circle), `declared` (open rectangle), `advice` (right-pointing triangle outline), `link-confirmed` (two links joined, solid line), `link-provisional` (two links, dashed line), `link-unresolved` (two links with a gap), `replay` (a tape-reel outline), `injected` (a diagonal-hatched square), `evidence` (a small document with a corner fold), `hash` (a hash sign), `stop` (a square with a diagonal slash, for forbidden actions), `person` (a simple head and shoulders, for human-only steps). Do not add sparkles, arrows, bolts, shields or locks.

## 5.7 Evidence classes (shown wherever an evidence chip or row appears)
| Class | Glyph | Meaning (plain words shown to the user) |
|---|---|---|
| Observation | `observed` | Read from a system (or its recording) |
| Derived | `derived` | Computed from observations by a fixed rule |
| Inference | `inferred` | A reasoned link; not stated by either system |
| Declared | `declared` | Stated by the operator, not read from a system |
| Advice | `advice` | A suggestion for a person |

The API's evidence items carry `source` (`paypal`, `store`, `engine`), `field`, `value`, `observedAt`, `rawHash`. Map: `paypal` and `store` items are Observations; `engine` items are Derived unless `field` is an identity-basis field, which is shown as Inference; the operator-declared plugin version is Declared. If a mapping is uncertain, show no class glyph and add a question to `ui/CONTRACT-QUESTIONS.md`.

---
# PART 6. THE PRODUCT'S STATE LANGUAGE
This is the heart of the interface. It must be learnable in ten seconds.

## 6.1 Identity (three states)
| State | Glyph | Label shown | Colour | Frame |
|---|---|---|---|---|
| `confirmed` | `link-confirmed` | "Confirmed: both systems name each other" | `--accent` | solid 1px accent frame |
| `provisional_association` | `link-provisional` | "Provisional association" | `--amber` | **dashed** 1px amber frame, `--amber-tint` fill |
| `unresolved` | `link-unresolved` | "Unresolved: cannot link the two orders" | `--slate` | dotted 1px slate frame, `--slate-tint` fill |

For provisional, `identity.requiredNotice` is printed in full, 16 px, inside the frame, in the visible area, never in a tooltip or collapsed. For unresolved, show `identity.reason` (mapped to plain words from Part 12.2) and, when `needs.paypalOrderId` is true, the "paste the PayPal order ID" prompt that starts a new investigation.

## 6.2 Verdict
Show a plain headline from the map in Part 12.1, the raw `decision.verdict` code in mono beside it, `decisionStatus` ("A rule matched" or "The tool abstained"), `decision.reason`, `decision.finding` when present, and `ruleRow` as "Rule row 6 of 14". Styling is ink on `--surface`, with the glyph for the verdict family. `unknown` and `abstain` get the `stop`-free neutral glyph (`inferred` outline) and the sentence "The evidence is not enough to say." They are findings.

## 6.3 Source label (every investigation)
* **Replay:** a bordered tag with the `replay` glyph and the text from `source.label`, for example "REPLAY · recorded real sandbox capture". Sticky under the header while scrolling the result.
* **Injected:** see 6.7.
* **Live (only if `/health` lists it):** "LIVE SANDBOX". Not enabled in this build; implement the style but never show a switch for it.

## 6.7 Injected is unmistakable
When `source.mode === "injected"`:
1. A full-width band directly under the header, 44 px high, `--amber-tint` fill with a 45 degree diagonal hatch of `--amber` at 14 percent, containing the `injected` glyph and the text "INJECTED · not a real merchant incident" in 14 px caps. It does not scroll away (sticky under the header).
2. The Systems panel gets the same hatch as a 4 px top border.
3. The page `<title>` is prefixed "Injected: ".
4. Every screenshot and video frame of an injected case therefore shows the label with no extra effort.
Replay cases must never use any amber hatch. Real and injected must be distinguishable in greyscale.

## 6.8 Observed time
Label every time "observed at". Never "happened at", "occurred" or "completed at". Format: `2026-11-03 14:22 UTC` in mono, with the local offset on hover or focus (title attribute is not enough: use an accessible popover). Replay times are "recording time, not now": show that sentence under the Systems panel for replay (it is the first line of `limits[]` for replay, so just render `limits[]`).

## 6.9 Null systems
`systems.paypal` or `systems.store` equals `null` means not read. Show the panel with the title, the text "Not read", and the reason in plain words (for example the store panel when `custom_id` was unusable). Never an empty panel, never "0" or "none".

---
# PART 7. COMPONENT CATALOGUE
Build these as typed React components with props from the contract. Each has a story-style test page at `/_kit` (excluded from the production build) that renders every state in both themes.

| Component | Purpose | Key states |
|---|---|---|
| `SiteHeader` | Sticky header: wordmark, five text links, theme switch | default, scrolled (adds a 1px bottom hairline), mobile menu open |
| `SkipLink` | "Skip to content" | visible on focus |
| `ThemeSwitch` | Light / dark / system, three-way | each, focus |
| `SourceTag` | `replay` / `live` label with glyph | replay, live |
| `InjectedBand` | Full-width injected band (6.7) | visible |
| `VerdictCard` | 6.2 | rule matched, abstain, unknown, every verdict from 12.1 |
| `IdentityPanel` | 6.1 | confirmed, provisional, unresolved (with and without `needs`) |
| `SystemPanel` (x2) | One system's facts: status, normalised status, amount and currency, observed-at, captures, store facts | normal, null (not read), multiple captures, long values |
| `CaptureList` | Each capture: id (mono), status, amount, currency | 0, 1, many |
| `ExplanationBlock` | Statements with chips and a kind tag | template, ai_validated, rejected, timeout, error, not_configured |
| `EvidenceChip` | Inline `EV-0001` reference with class glyph | default, focus, selected |
| `EvidenceDrawer` | Right-side drawer (bottom sheet on mobile) showing one evidence item | open, loading, not found |
| `EvidenceTable` | All evidence items | 1 to 30 rows, sortable by id only |
| `ActionsList` | Safe suggestions and forbidden actions | safe only, forbidden only, both |
| `LimitsPanel` | "What this result does not tell you" | 1 to 8 items |
| `IntegrityPanel` | Hash specification and stored-copy hashes | normal, null hashes |
| `FingerprintLine` | State fingerprint and audit ID line | with and without auditId |
| `ErrorPanel` | Part 12.5 | every code in the contract |
| `CaseRow` | One case from `GET /cases` | replay, injected, hover, focus |
| `OrderIdForm` | Input and Investigate button | idle, invalid, loading, disabled |
| `Skeleton*` | Shaped loaders per component (15.1) | loading |
| `TwoLedgers` | The 3D scene (Part 8) | animating, paused, reduced motion, static |
| `PipelineDiagram` | The eight-step SVG on How it works | desktop horizontal, mobile vertical |
| `HonestyTable` | Part 9.5 | desktop, mobile (stacked rows) |
| `Footer` | Part 14 | default |

**Rules for components.** Pure presentation from props; one data hook per route; no component may import raw fixture JSON except the mock client. Every interactive element has a visible focus style and an accessible name. Every list has real list semantics. Tables use real `<table>` markup with `<th scope>`.

---
# PART 8. MOTION AND THE ONE 3D SCENE
## 8.1 Motion principles
* Motion explains; it never decorates. Allowed: state changes, drawer open/close, the single scene, a gentle opacity-and-4px fade-in when a section enters the viewport (once, 240 ms).
* Durations: 120 ms (colour, underline), 200 ms (drawer, tabs), 360 ms (scene transitions). Easing: `cubic-bezier(0.2, 0, 0, 1)` for entering, `cubic-bezier(0.4, 0, 1, 1)` for leaving. No spring or overshoot.
* No parallax of images, no scroll-jacking, no pinned stacking, no cursor effects, no hover lift or scale, no looping decorative animation anywhere except the scene.
* `prefers-reduced-motion: reduce`: the scene shows its static composition (State B below), fades replace slides, no autoplay.
* Do not animate on the Investigation view at all except the drawer and skeleton shimmer (shimmer is a 1.4 s opacity pulse of `--surface-2`, not a gradient sweep).

## 8.2 The scene: "Two Ledgers" (home hero, right side; also a smaller static version on How it works)
**Purpose.** One picture of the product's one idea: two systems each hold a record of one order, and a link between them can be confirmed, provisional or missing.

**Construction (CSS 3D plus inline SVG; no WebGL, no library required).**
* A container with `perspective: 1400px`, 560 px tall (desktop), 360 px (mobile), `transform-style: preserve-3d`.
* Two rectangular planes, each 420 x 250 px, `--surface` fill, 1px `--hairline-strong` border, radius 6, **no shadow**. Plane A (upper) is labelled in caps "PAYPAL ORDER"; plane B (lower) "STORE ORDER". They are stacked 150 px apart along the Z axis, both rotated `rotateX(58deg) rotateZ(-24deg)` so they read as sheets lying in perspective. A very slow 1.5 degree drift on the X axis and pointer parallax of at most 3 degrees (disabled on touch and reduced motion).
* On each plane: five hairline rows made of short mono labels and **placeholder bars**, not numbers. Row labels: `status`, `amount`, `currency`, `observed at`, `order id`. Values are drawn as 1px outlined bars of varied length. **No digits and no real-looking IDs anywhere in the scene.**
* Between the planes, one SVG "thread" (a vertical path connecting the `order id` row of A to the `order id` row of B), stroke 1.5px.
* A caption under the scene in 12 px caps: "ILLUSTRATION OF THE IDEA. NOT DATA."

**The 12-second loop (three states, each held 3.2 s, 0.4 s transitions).**
| State | Thread | Label beside the thread | Matches |
|---|---|---|---|
| A | solid, `--accent`, both ends capped with small squares | "Confirmed: both name each other" | `confirmed` |
| B | dashed (6 4), `--amber`, a small `inferred` glyph at the midpoint | "Provisional: link inferred" | `provisional_association` |
| C | two separate stubs with a visible gap, `--slate` | "Unresolved: cannot link" | `unresolved` |
The loop pauses on hover or focus within the scene, and a visible Pause / Play text button (not an icon) controls it. Reduced motion shows State B, because it is the state the product most needs to explain, with the label and caption visible.

**Craft requirements.** Edges must stay crisp at 1x and 2x pixel density (`will-change: transform` only during transitions). The scene must not cause layout shift, must keep 60 fps on a mid-range laptop, and must render nothing heavier than about 40 KB of markup and CSS. Provide a flat SVG fallback (`TwoLedgers.static.svg`) used when 3D transforms are unsupported and for the Open Graph image.

## 8.3 A smaller reuse
On **How it works**, show the same planes statically (no loop) with the three thread states side by side in three small panels labelled by identity state.

---
# PART 9. HOME PAGE (`/`)
Section order, each described with layout, copy and behaviour. Page background `--paper`. Section gaps 112 px desktop, 72 mobile.

## 9.1 Hero
Layout: 12-col. Left, columns 1 to 6: eyebrow, H1, lead, fine print, two actions. Right, columns 7 to 12: the Two Ledgers scene. On mobile the scene sits under the text at 360 px tall.
```COPY
EYEBROW: Prototype · sandbox data only
H1: Give it a PayPal order ID.
LEAD: It reads that order from PayPal and the matching order from WooCommerce, shows what each system says, says whether it can link them and where they disagree (or that it cannot tell), and lists which next steps are safe and which are forbidden. It changes nothing in either system.
FINE PRINT: It writes one thing: a local record of each investigation.
PRIMARY ACTION: Open a recorded case   (links to /investigate)
SECONDARY ACTION: What it cannot tell you   (links to /evidence)
SCENE CAPTION: ILLUSTRATION OF THE IDEA. NOT DATA.
```
H1 is Newsreader 64/68 on one line at desktop width if it fits, else two. The lead is Hanken 20/32 in `--ink-2`. No logo strip, no badges, no stats.

## 9.2 Statement band (single sentence, large)
A full-width section with a 1px top hairline. Left label column (1 to 3): caption "01 · THE PROBLEM WE ASSUMED". Right (4 to 11): one Newsreader 30/38 paragraph.
```COPY
LABEL: 01 · The problem we assumed
BODY: A WooCommerce store and PayPal can hold two different stories about one payment. We assumed a merchant has to check both by hand. We have not tested that assumption with any merchant.
```
(The honesty is the point; do not soften or remove the last sentence.)

## 9.3 What one investigation gives you (editorial list, not cards)
Five full-width rows, each separated by a hairline: a mono number `01` to `05` in the left column (cols 1 to 2), the title in H3 (cols 3 to 6), the description in body text (cols 7 to 12). No icons, no boxes. Hover: row background `--accent-tint`.
```COPY
SECTION LABEL: 02 · What one investigation gives you
01 | Both systems, side by side | PayPal's view of the order and the store's view, each with the time we observed it. The two reads are not simultaneous.
02 | A plain answer on identity | Confirmed when both systems name each other. Provisional when we only infer the link. Unresolved when we cannot link them.
03 | Where they disagree, or that we cannot tell | The disagreement we observed and when we observed it. When the evidence is not enough, the result says so and stops.
04 | Evidence behind every sentence | Each statement points to the stored items it came from, and each item carries a hash of the stored copy.
05 | Human-only next steps | Suggestions for a person to consider, and a list of actions this tool will not take.
```

## 9.4 The real component, live on the page
Heading in H2, then a **segmented text tab control** with three tabs and the real `Investigation` view (the same components as `/investigate`, fed by fixtures through the mock client) below. Tabs: "Order 17: both agree" (`investigation-confirmed-ok`), "Order 20: provisional link" (`investigation-provisional-approved-not-captured`, selected by default), "Injected: amount differs" (`investigation-injected-amount-mismatch`). Evidence chips are clickable and open the real drawer. The view is inside a 1px hairline frame with a small header row "RECORDED EXAMPLE · you can click the evidence". The injected tab shows the injected band inside the frame.
```COPY
SECTION LABEL: 03 · A recorded case
H2: See what a result looks like.
INTRO: This is order 20 from our sandbox store. PayPal shows the buyer approved it and no capture is recorded. The store does not hold the PayPal order ID, so the link between the two is only a provisional association.
FRAME HEADER: RECORDED EXAMPLE · click the evidence to open it
LINK BELOW: Run this case yourself   (links to /investigate with the case preselected)
```
If a tab switches the intro sentence must change to match; supply per-tab intros:
```COPY
TAB 1 INTRO: This is order 17, a completed order. PayPal shows one completed capture and the store shows the order as paid.
TAB 2 INTRO: This is order 20 from our sandbox store. PayPal shows the buyer approved it and no capture is recorded. The store does not hold the PayPal order ID, so the link between the two is only a provisional association.
TAB 3 INTRO: This case was written by us. A capture's amount differs from the store total. It is injected, not a real merchant incident, and the band says so.
```

## 9.5 What is real, what is injected, what is not built
A real `<table>` (desktop: two columns with a wide hairline-ruled layout; mobile: stacked rows). No colours except text and hairlines. This replaces social proof.
```COPY
SECTION LABEL: 04 · What is real
H2: What you are looking at, exactly.
ROW 1 | Recorded real sandbox orders | Three orders from one local WooCommerce 11.2.1 store with the PayPal Payments plugin 4.2.0, recorded once and replayed from files.
ROW 2 | Injected cases | Three cases we wrote ourselves to exercise the rules. They are labelled on screen and are not real merchant incidents.
ROW 3 | Live reads from PayPal and WooCommerce | Not enabled in this build.
ROW 4 | Fixing orders, capturing payments, refunds | Not built. Not part of this submission.
ROW 5 | AI explanations | Optional and off by default. Fixed templates write the explanations you see here.
ROW 6 | Testing with merchants | None. We do not know how often the verdicts are right.
LINK: Read the full evidence and limits   (links to /evidence)
```

## 9.6 Closing line
One sentence in Newsreader 30/38, left aligned, then two text links. No big banner.
```COPY
BODY: Nothing here fixes an order or moves money. A person decides what to do next.
LINK 1: Open a recorded case   (/investigate)
LINK 2: How it works   (/how-it-works)
```

---
# PART 10. HOW IT WORKS (`/how-it-works`)
Purpose: let a careful reader see the whole method in one scroll and find every limit. Layout: H1 and lead in columns 1 to 7; below it the pipeline diagram full width; below that eight numbered steps in a two-column definition layout (number and title left, text right).

## 10.1 Header
```COPY
EYEBROW: How it works
H1: One order, read twice, compared with care.
LEAD: The method is a fixed set of steps. Nothing in it decides on its own what to do with a payment.
```

## 10.2 Pipeline diagram (`PipelineDiagram`)
Inline SVG, eight nodes connected by 1px lines, each node a rectangle (radius 4, hairline border) with a mono number and a two-word label: `01 Input`, `02 Two reads`, `03 Identity`, `04 Decision`, `05 Evidence`, `06 Explanation`, `07 Next steps`, `08 Record`. Desktop: one row of eight, 1200 px wide, with a second thin line beneath nodes 02 to 05 labelled "not simultaneous" over the span of node 02 only. Mobile: vertical list with a left rule. Nodes 06 and 08 carry a small caption under them: "template by default" and "local only". Static (no animation). The diagram must be an accessible figure with a text alternative that is the eight step titles in order.

## 10.3 Steps (verbatim)
```COPY
01 | Input | You give it a PayPal order ID, or choose a recorded case.
02 | Two reads | It reads the PayPal order and the matching WooCommerce order. The two reads are not simultaneous, so the state can change between them. Each is shown with the time we observed it.
03 | Identity | It checks whether the two orders name each other. If only PayPal-side details point to the store order, the link is a provisional association. If it cannot link them, it says so.
04 | Decision | A fixed table of 14 rules, checked in order, picks the verdict. When no rule fits or the evidence is incomplete, the tool abstains. A matched rule is not a measure of accuracy.
05 | Evidence | Each statement cites stored evidence items. Each item carries a hash of the stored copy, which identifies the copy and does not show that PayPal or the store said it.
06 | Explanation | Fixed templates write the explanation. An optional AI step can rephrase it. That step is off by default, and its text is shown only if it passes a check against the evidence.
07 | Next steps | The result lists suggestions for a person and actions the tool will not take. Nothing is executed.
08 | Record | A local record, an audit entry and an evidence bundle are written. The bundle can be re-run offline to show that the decision follows from the stored inputs. It does not show that the inputs matched PayPal or the store.
```

## 10.4 Aside: "What it writes"
A bordered aside beside steps 7 and 8 (desktop) or under them (mobile):
```COPY
TITLE: What it writes
BODY: Only local files and memory on the machine that runs the server: the investigation record, a line in an audit log, and an evidence bundle. It writes nothing to PayPal and nothing to WooCommerce.
```

---
# PART 11. EVIDENCE AND LIMITS (`/evidence`)
Purpose: the page that makes judges trust the rest. Tone: an incident report's "known limits" section. Left-aligned, no decoration, a sticky in-page contents list on desktop (columns 1 to 3).

## 11.1 Header and what we observed
```COPY
EYEBROW: Evidence and limits
H1: What we observed, and what we do not know.
LEAD: Read this before you rely on any result. It lists what the prototype has actually seen and what it cannot tell you.

H2: What the evidence covers
ROW 1 | Three recorded real sandbox orders | Orders 13, 17 and 20 from one local WooCommerce 11.2.1 store with the PayPal Payments plugin 4.2.0, in PayPal's sandbox. Each was recorded once. The recordings are checked against a hash list. That shows the files have not changed since the list was made. It does not show that PayPal or WooCommerce produced them.
ROW 2 | One timing observation | In one sandbox run, PayPal created a capture about 50 minutes after the order was created. That is one order, not a typical delay.
ROW 3 | Order 20 | PayPal shows it as approved, with no capture recorded. The store did not hold the PayPal order ID, so the link between the two is a provisional association.
ROW 4 | Three injected cases | Cases we wrote to exercise the rules: a capture the store shows as unpaid, an amount that differs from the store total, and two captures on one order. They have not been observed in a real store.
ROW 5 | Automated tests | They check how the code behaves on our cases. They do not measure how often a verdict is right.
```

## 11.2 Limits (numbered list; the numbers are real list numbers)
```COPY
H2: What this tool does not know
1 | It cannot know that two orders are the same purchase when WooCommerce does not hold the PayPal order ID. It can only suggest a provisional association.
2 | It does not find problem orders. You supply the PayPal order ID.
3 | It has seen PayPal's sandbox and one plugin version in one store setup (block checkout, a virtual product, US dollars, one way of interrupting a payment). It says nothing about other setups.
4 | The plugin version is declared by the operator. It is not read from the store.
5 | It does not know when a disagreement began, only when we observed it.
6 | Its two reads are not simultaneous. State can change between them.
7 | It does not add up several captures, and it does not handle refunds, partial captures, currency conversion or fees.
8 | A verdict means a rule matched. It is not a measured accuracy. No merchant has tested the central idea.
9 | Removal of personal data from stored records is best effort and can miss fields.
10 | The audit log shows that its entries are consistent with each other. It does not show that the data was genuine, and someone with access to the file could rewrite all of it.
```

## 11.3 How to read the labels used in this tool
A definition list (term in H3, text beside):
```COPY
H2: How to read the labels
Replay | A recording of a real sandbox order, played back from a file. The times are recording times, not now.
Injected | A case written by us to exercise the rules. It is not a real merchant incident.
Observation | Read from a system, or from its recording.
Derived | Computed from observations by a fixed rule.
Inference | A reasoned link that neither system states.
Declared | Stated by the operator, not read from a system.
Advice | A suggestion for a person.
Hash | A fingerprint of a stored copy of a record. It does not show that PayPal or the store said it.
Chain check | A check that audit entries are consistent with each other. It does not prove the data was genuine.
```

## 11.4 Footer line of the page
```COPY
BODY: The repository lists every requirement with its tests and its evidence, and marks what is not built.
```

---
# PART 12. INVESTIGATE (`/investigate`) AND CASES (`/cases`)
This part restates and extends `05b` Screens A to D. Where they differ, **this file governs appearance; 05b and the contract govern behaviour**.

## 12.0 Start screen
Layout: left (cols 1 to 7): promise as H1 plus lead, the form, the help text. Right (cols 8 to 12): "Recorded cases" list (CaseRow x6, replay first then injected, with source tags). On mobile, the form first, then cases.
```COPY
H1: Give it a PayPal order ID.
LEAD: It reads that order from PayPal and the matching order from WooCommerce, shows what each system says, says whether it can link them and where they disagree (or that it cannot tell), and lists which next steps are safe and which are forbidden. It changes nothing in either system.
FIELD LABEL: PayPal order ID
FIELD HELPER: Letters and digits, 10 to 30 characters. The server checks the format.
BUTTON: Investigate
HELP TITLE: Where do I find the ID?
HELP BODY: In the PayPal transaction details, or on the WooCommerce order page when the store holds it. Some stuck orders do not have it in the store. Then you need PayPal's copy.
CASES TITLE: Or open a recorded case
CASES INTRO: Recorded cases come from a real sandbox store. Injected cases were written by us and are labelled.
NOTE BELOW FORM: Typed order IDs are looked up in recorded and injected data only in this build.
```
The last line is shown only when `GET /health` does not list `live`. A typed ID that is not a known recorded or injected ID will produce an error from the server; show it through the normal error panel.

## 12.1 Verdict headlines (map `decision.verdict` to a plain headline; always also show the raw code in mono)
```COPY
ok | Both systems agree: completed and paid
not_approved | PayPal shows the order as not yet approved
approved_not_captured | Approved on PayPal, no capture recorded
approved_not_captured_locally_cancelled | Approved on PayPal, no capture recorded, store order cancelled
captured_local_unpaid | Captured on PayPal, store order not marked paid
captured_local_cancelled | Captured on PayPal, store order cancelled
capture_pending | PayPal lists the capture as pending
capture_declined | The capture did not succeed on PayPal
multiple_captures | More than one capture on this order
amount_mismatch | Captured amount or currency differs from the store total
unknown | Not enough evidence to diagnose this order
```
`decisionStatus` labels: `rule_matched` → "A rule matched"; `abstain` → "The tool abstained". If a verdict code is not in this table show the raw code and add a question to `ui/CONTRACT-QUESTIONS.md`.

## 12.2 Reason map (`identity.reason`, shown under the identity label)
```COPY
store_has_no_paypal_order_id | The store order does not hold a PayPal order ID.
ids_disagree | The two orders do not name each other.
plugin_version_not_recorded | The plugin version is not one we have recorded, so we do not interpret its fields.
paypal_custom_id_missing | The PayPal order has no usable store order number.
```
Any other reason: show the code in mono under the label "Reason code", and add a question to `ui/CONTRACT-QUESTIONS.md`.

## 12.3 Result page anatomy (desktop ≥1024)
Header, then the source tag (sticky) or injected band (sticky). Under it a 12-column layout:
* **Main column (cols 1 to 8), top to bottom:**
  1. `VerdictCard` (H2 "Verdict").
  2. `SystemPanel` PayPal and `SystemPanel` Store side by side (each 4 columns), H2 "What each system says", with the sentence "Times are when we observed each system, not when anything happened." under the heading.
  3. `ExplanationBlock` (H2 "Explanation").
  4. `EvidenceTable` (H2 "Evidence"), collapsed to the first five rows with "Show all N items".
  5. `LimitsPanel` (H2 "What this result does not tell you").
  6. `IntegrityPanel` (H2 "Integrity") and `FingerprintLine`.
* **Side column (cols 9 to 12), sticky below the header:**
  1. `IdentityPanel`.
  2. `ActionsList` with H3 "Suggested next step (a person decides)" using the `person` glyph, then H3 "Not allowed here" using the `stop` glyph.
  3. A text link row: "Start another investigation", "Download nothing" is **not** present; there is no download.
Tablet (640 to 1023): single column in this order: source, verdict, identity, systems (stacked), explanation, next steps, evidence, limits, integrity. Mobile (360): same order, systems stacked, evidence table becomes a list of definition rows.

## 12.4 Section details
* **SystemPanel:** title ("PayPal" or "Store"), normalised status first (large, Hanken 600 24), then raw status in mono, amount with currency (`USD 49.00` style, tabular), "observed at" time, for PayPal the captures list, for the store `holdsPayPalOrderId` as the sentence "Store holds the PayPal order ID: yes" or "no", the plugin version with the words "declared by the operator", and the order number.
* **ExplanationBlock:** each `statements[]` item is a paragraph of 18/28 text followed by its chips on the same line when space allows. A small tag at the top: "Standard explanation (fixed template)" for `template`, "AI-rephrased from the evidence" for `ai_validated`. When `kind` is `ai_validated`, add under the tag: "It was checked against the evidence. That check does not prove the text is true." When `aiRejected` is true: "The AI text did not pass the check, so the standard explanation is shown." `aiStatus: "not_configured"` shows nothing at all.
* **EvidenceChip:** `EV-0001` in mono inside a 2px-radius hairline chip with the class glyph. Click or Enter opens the drawer with that item.
* **EvidenceDrawer:** right-side, 420 px wide (bottom sheet on mobile), `--surface`, hairline left border, focus trapped, Escape closes, focus returns to the chip. Content: the item ID, class (glyph and word), source, field, value (mono), observed at, "Stored copy hash" with the `rawHash` (or "None: derived by the engine"), and the sentence "This hash identifies the stored copy. It does not show that PayPal or the store said it." If the item cannot be loaded (`evidence_not_found`), show the ErrorPanel inside the drawer.
* **ActionsList:** each safe action is a plain text item with the `person` glyph, its `label`, and a muted line "Rule SAF-4". Each forbidden action has the `stop` glyph, the action `id` in mono, the `reason`, and the rule. No buttons, no links, no hover effect that implies clickability. A small note under the list: "These are suggestions for a person. The tool does not do any of them."
* **IntegrityPanel:** show `integrity.hashSpec` text, the PayPal and store stored-copy hashes (mono, truncated middle with a copy affordance that is a text button "Copy"), and `integrity.note` verbatim. Label them "Stored copy hash". Never "verified", "authentic", "signed", "secure" or "tamper-proof".
* **FingerprintLine:** "State fingerprint (identifies the facts this result used): {hash}" and "Audit entry: {auditId}" or "No audit entry".
* **Raw JSON:** a text button "Show raw response" at the bottom opens a read-only `<pre>` of the response (mono, scrollable). It helps judges check that nothing is hidden.

## 12.5 Error panel (non-200). Never shows a verdict.
Frame: 1px `--error` border, `--error-tint` fill, the headline in H2, body text, then the server message verbatim in a mono well labelled "Server message", then `partial` details when present as a small definition list (System, Reason, Observed at), then `auditId` as "Audit entry" when present, then actions: "Try again" (secondary) and "Back to start" (text link). Small line at the bottom: "No result was produced. The tool shows no verdict when it cannot read both systems."
```COPY
400 invalid_order_id | That does not look like a PayPal order ID | Check the ID and try again.
400 invalid_body | The request could not be used | Check what you entered and try again.
400 unknown_case | That case is not available | Choose a case from the list.
403 mode_not_enabled | This mode is not available here | This build reads recorded and injected cases only.
404 paypal_order_not_found | PayPal says there is no such order | PayPal answered that it has no order with this ID. Check the ID and whether you meant the sandbox.
404 store_order_not_found | The store says there is no such order | The store answered that it has no order with this number. Check the number.
404 investigation_not_found | That record is not available | Investigations are held in memory and are lost when the server restarts.
404 evidence_not_found | That evidence item is not available | It may belong to a record that is no longer held.
429 rate_limited | Too many requests | Wait a moment and try again.
502 upstream_unreachable | We could not reach {system} | The read did not complete.
502 upstream_auth_rejected | The credential for {system} was rejected | Nothing was retried. This is a setup matter for whoever runs the server. It is not something to fix on this page.
502 upstream_bad_response | {system} answered in a way we could not use | The read did not complete.
504 deadline_exceeded | The read took longer than 30 seconds | It is not known which system was slow.
500 internal_error | Something went wrong on the server | The read did not complete.
```
`{system}` is "PayPal" or "the store" from `partial.system`; if `partial` is null, drop the phrase ("We could not complete the read"). Never suggest the user change permissions or credentials.

## 12.6 Loading
On submit: the form stays, the page shows `SkeletonInvestigation` and the sentence "Reading both systems." with an elapsed-seconds counter that starts after 3 seconds ("12 s of 30 s allowed"). Cancel is a text button "Stop waiting" that only abandons the request in the browser; it does not claim to cancel anything on the server (add the helper text: "The server may still finish and keep a record.").

## 12.7 AI labelling summary
Words only. No sparkle, no gradient, no "AI-powered", no badge. Exactly the strings in 12.4 under ExplanationBlock.

## 12.8 URL state
`/investigate?case=replay-order-20` runs that case on load. `/investigate?paypal=ID` pre-fills the field but does not auto-run. `/investigate/{id}` shows a stored investigation (`GET /investigations/{id}`); if it is not found show the 404 panel.

## 12.9 Cases page (`/cases`)
A hairline-ruled list of all cases from `GET /cases`. Group heading "Recorded real sandbox captures" then "Injected cases (written by us)". Each row: title (H3), source tag, one line from this table, and the text link "Run this case".
```COPY
replay-order-13 | Both systems agree. A completed order from the S0-A recording.
replay-order-17 | Both systems agree. A completed order from the S0-B recording.
replay-order-20 | PayPal shows it approved with no capture recorded. The store does not hold the PayPal order ID.
injected-captured-local-unpaid | Written by us. PayPal shows a capture, the store still shows the order as pending.
injected-amount-mismatch | Written by us. A capture's amount differs from the store total.
injected-multiple-captures | Written by us. Two captures on one order.
```
Cases not in this table show only their `title`.

## 12.10 Audit page (`/audit`, low priority, linked only from the footer)
H1 "Audit chain check". Button "Run the check" (calls `GET /audit/verify`). Show `ok`, `entries`, `firstBadIndex`. Required text:
```COPY
BODY: This checks that the audit entries are consistent with each other. It does not show that the data was genuine, and it cannot detect someone who rewrites the whole file.
```

---
# PART 13. LEGAL AND ABOUT PAGES
These pages exist because a payments-adjacent product without them looks careless. They are plain-language prototype notices. **They were not reviewed by a lawyer**; say so on the page (supplied copy does).

## 13.1 Data and privacy (`/data`)
```COPY
EYEBROW: Data and privacy
H1: What is stored and what leaves your machine.
LEAD: This is a prototype that uses sandbox data. This page says what it stores and what it sends.
H2 | What this site collects
BODY | Nothing about you. The site sets no cookies, runs no analytics and loads no third-party scripts, fonts or images. Your choice of light or dark theme is saved in your browser's local storage and nowhere else.
H2 | What the investigator stores
BODY | Each investigation creates a record on the server that runs the API: the result you see, a line in an audit log and, if switched on, an evidence bundle file. These hold order statuses, amounts, currencies, order and capture identifiers and times. Buyer names, email addresses, postal addresses, notes and payment-method details are not stored. Removal of personal data is best effort and can miss fields that are not on its list.
H2 | Sandbox identifiers
BODY | Recorded cases contain PayPal sandbox order IDs. They are not secrets.
H2 | AI explanations
BODY | Off by default. If the operator switches them on, the statuses, amounts, identifiers and times in the engine's result are sent to the chosen model provider (Google or NVIDIA) so it can rephrase them. Buyer details are not sent.
H2 | How long it is kept
BODY | Investigations are held in the server's memory and are lost when it restarts. Audit logs and bundle files stay on the server's disk until the operator deletes them. There is no automatic deletion.
H2 | Live data
BODY | This build does not read live PayPal or store data.
H2 | Questions
BODY | To ask about this prototype, use the contact details on its hackathon submission page.
NOTE | This notice was written by the project author and has not been reviewed by a lawyer.
```

## 13.2 Prototype terms (`/terms`)
```COPY
EYEBROW: Prototype terms
H1: Terms for using this prototype.
1 | What this is | A prototype built for the PayPal AI Hackathon. It works on sandbox data and recorded examples.
2 | No reliance | Do not use its output to decide anything about real payments or real customers. It is not financial, legal or accounting advice.
3 | No warranty | It is provided as it is, without warranty of any kind. It may be wrong or unavailable.
4 | Independence | It is not affiliated with, endorsed by or sponsored by PayPal, WooCommerce or any other company named here. Names are trademarks of their owners and appear only to say which systems the tool reads.
5 | What you enter | Order IDs you enter are handled as described on the Data and privacy page. Do not enter real customer information.
6 | Changes | These terms may change. They are a plain-language notice, and a lawyer has not checked them.
```

## 13.3 About (`/about`)
```COPY
EYEBROW: About
H1: A one-person prototype.
BODY: Incident Investigator was built by one developer for the PayPal AI Hackathon. It started from a question: when a WooCommerce store and PayPal disagree about an order, how quickly can someone see what each system says and what is not known? We have not tested that question with any merchant.
BODY 2: The project keeps a written record of its requirements, tests and evidence in its repository, including what is not built.
```

---
# PART 14. GLOBAL SHELL
## 14.1 Header
Height 64 px, `--paper` fill, 1px bottom hairline appears after the page scrolls 8 px. Left: the wordmark "Incident Investigator" in Newsreader 500 20 (text only; no logo mark). Centre-right text links in Hanken 500 15: "Investigate", "Cases", "How it works", "Evidence and limits", "Data and privacy". Right: the theme switch. The current page link has a 2px accent underline and `aria-current="page"`. Mobile: wordmark left, a text button "Menu" right; the menu is a full-height sheet with the same links at 20 px and 56 px row height, plus the theme switch. No hamburger icon.

## 14.2 Footer
Top hairline, `--paper` fill, 72 px top padding. Four columns on desktop (1 to 4, 5 to 7, 8 to 10, 11 to 12), stacked on mobile:
```COPY
COL 1 TITLE: Incident Investigator
COL 1 BODY: A prototype for the PayPal AI Hackathon. Sandbox data only.
COL 2 TITLE: Explore
COL 2 LINKS: Investigate · Cases · How it works · Evidence and limits
COL 3 TITLE: Notices
COL 3 LINKS: Data and privacy · Prototype terms · About · Audit chain check
COL 4 TITLE: Build
COL 4 BODY: Build {version from GET /health}
DISCLAIMER: Independent prototype built for the PayPal AI Hackathon. Not affiliated with, endorsed by or sponsored by PayPal or WooCommerce. PayPal and WooCommerce are trademarks of their owners. Nothing on this site is financial, legal or accounting advice.
```
Nothing else: no social icons, no newsletter, no status dot, no "All systems operational". If `GET /health` fails, COL 4 shows "Build unknown" and nothing alarming.

## 14.3 404
Centred (the only centred layout besides empty states).
```COPY
H1: That page does not exist.
BODY: Try the start page or the list of recorded cases.
LINKS: Investigate · Cases
```

## 14.4 Document titles and metadata
Titles: "Incident Investigator" (home), "Investigate · Incident Investigator", "Cases · …", "How it works · …", "Evidence and limits · …", "Data and privacy · …", "Prototype terms · …", "About · …". Injected investigations: "Injected: {verdict headline} · Incident Investigator". Meta description for home: the first sentence of the lead. Open Graph image: the static scene SVG rendered to 1200 x 630 PNG with the caption "ILLUSTRATION OF THE IDEA. NOT DATA." in it.

---
# PART 15. STATES, EDGE CASES AND CONTENT RULES
## 15.1 Skeleton loaders (required for every async view)
Skeletons mirror the real layout so nothing jumps: `SkeletonInvestigation` has a verdict block (two bars, 28 and 16 px high), an identity block, two system panels with four labelled rows each, an explanation block of three 18 px lines, and five evidence rows. Fill `--surface-2`, radius 2, a 1.4 s opacity pulse between 100 and 60 percent (no gradient sweep). Reduced motion: no pulse. Skeletons are `aria-hidden` and the container has `aria-busy="true"` plus a visually hidden "Loading" status.

## 15.2 Empty, long and odd content
* Evidence list empty: "No evidence items were returned." (this should not occur; show it plainly).
* Captures empty: "No captures recorded." (not "0 captures").
* Long IDs and hashes: mono, break anywhere, never overflow horizontally; truncate hashes in the middle with a full value reachable by focus and by the Copy button.
* A `statements[]` text 600 characters long must wrap cleanly with chips below it.
* Currency formatting: show the `amount` string as given with the currency code beside it. Do not reformat or round. Do not convert.
* Times: show as given in UTC.
* Unicode and RTL strings from the API render safely as text (never as HTML).
* Never use `dangerouslySetInnerHTML`.

## 15.3 The matrix every screen must pass
For each of the 17 fixtures render the Investigation or ErrorPanel in: light and dark, 360 px and 1280 px wide, with default and increased text size (200 percent). That is 68 renders. Deliver screenshots in `ui/screenshots/{fixture}-{theme}-{width}.png` (device scale factor 2).

## 15.4 Identity by verdict combinations to check by eye
confirmed + `ok`; provisional + `approved_not_captured`; unresolved + `unknown` with `needs.paypalOrderId`; unresolved (`ids_disagree`) + abstain; confirmed + `captured_local_unpaid` (injected); confirmed + `amount_mismatch` (injected); confirmed + `multiple_captures` (injected). In every combination, `unknown` and `abstain` are neutral ink, the injected band is visible, and no red or green appears outside the ErrorPanel.

---
# PART 16. ACCESSIBILITY, RESPONSIVENESS, PERFORMANCE
* WCAG 2.2 AA throughout. Run axe on every route and every fixture state; zero serious or critical violations; include the report.
* Keyboard: every control reachable in a logical order; visible focus (2px accent ring, 2px offset); drawer traps focus and returns it; Escape closes overlays; tab controls use arrow keys.
* Screen readers: landmarks (`header`, `nav`, `main`, `footer`), one `h1` per route, heading order without gaps, `aria-current` on the current link, the pipeline diagram and the scene have text alternatives, status changes (loading finished, error shown) announced in a polite live region.
* Colour is never the only signal; contrast checked for both themes (Part 4.3).
* Touch targets 44 x 44 px minimum. Text can scale to 200 percent without loss. Works at 320 px width with no horizontal page scroll (except inside `<pre>` and hash wells).
* Breakpoints: 360 (base), 640, 1024, 1280. Mobile-first CSS.
* Performance budget: first load under 150 KB of JS gzipped excluding fonts; fonts subset to Latin, three families, at most 6 files, preloaded for the two used above the fold; LCP under 2.0 s on a mid-range laptop over a fast connection; no layout shift above 0.05; the scene never blocks input.
* Printing: a print stylesheet for investigation results (light theme, no scene, hairline rules, the source label and limits included). Judges sometimes print.
* No `localStorage` dependency for anything except the theme choice; everything must work with storage blocked.

---
# PART 17. BUILD, STRUCTURE AND TOOLING
* **Stack:** Vite, React 19, TypeScript (strict), React Router. Plain CSS with custom properties (CSS Modules or a single `tokens.css` plus component CSS). Tailwind is allowed only if its default theme is fully replaced by the tokens above; do not use a component kit (shadcn, MUI, Chakra, Radix themes, daisyUI). Headless primitives for the drawer and tabs are allowed if they are unstyled and added without bringing third-party fonts or styles.
* **No runtime dependencies beyond:** react, react-dom, react-router. Everything else (icons, scene, charts) is hand-built. Dev dependencies: TypeScript, Vite, Vitest, Playwright, axe-core.
* **Location:** `ui/` at the repository root. The Node server in `app/` stays untouched.
* **Structure:**
```
ui/
  index.html
  public/fonts/            (self-hosted WOFF2 + LICENSES.txt)
  src/
    copy/                  (every public string, split by page; verbatim from this file)
    tokens.css             (all colours, type, spacing, radii; light and dark)
    api/client.ts          (one function per route; real and mock implementations)
    api/mock.ts            (reads docs/ui-fixtures through a Vite alias; dev only)
    components/            (Part 7)
    pages/                 (Home, Investigate, Cases, HowItWorks, Evidence, Data, Terms, About, Audit, NotFound)
    scene/TwoLedgers.tsx, TwoLedgers.static.svg
  scripts/copy-check.mjs   (see below)
  DESIGN-NOTES.md  COPY-QUESTIONS.md  CONTRACT-QUESTIONS.md
  screenshots/
```
* **API client:** base URL from `VITE_API_BASE` (default `http://127.0.0.1:8787/api/v1`). `VITE_USE_MOCK=1` serves fixtures. When the mock is active, a thin top strip on every page reads "Mock data from saved responses" (this strip is for development and the build for the video must run against the real server with `VITE_USE_MOCK` unset).
* **Copy check (build gate):** `ui/scripts/copy-check.mjs` runs `node ../scripts/claims-audit.mjs`. The audit already scans the `ui/` folder (it skips `node_modules`, `dist`, lock files). `npm run build` must fail when it reports a finding. Paste the passing output into your delivery message.
* **No console errors or warnings** on any route or fixture.
* **Routing:** history mode with a `404` page; the production build is a static bundle served by any static host; deep links work.
* **Security:** no HTML injection, strict CSP meta tag (`default-src 'self'`; `connect-src` limited to the API base; `style-src 'self'`; `font-src 'self'`; `img-src 'self' data:`), no inline event handlers, no `eval`. Treat every string from the API as untrusted text.
* **Git hygiene:** do not commit `node_modules`, `dist`, `.env`, or any key. This UI needs no secret.

---
# PART 18. DELIVERY, ORDER OF WORK, ACCEPTANCE
## 18.1 Order of work (report after each; stop and ask when blocked)
1. `DESIGN-NOTES.md` (reference study per Part 3; the 40-item table per Part 2; the token contrast table). **Stop here and send it to the owner** before building screens.
2. `tokens.css`, fonts, `SiteHeader`, `Footer`, theme switch, `/_kit` page with every component and state, light and dark.
3. `/investigate` and `/cases` against the mock fixtures, all 17 states, 68 screenshots.
4. `TwoLedgers` scene and the home page, including the live recorded-case component.
5. `/how-it-works`, `/evidence`, `/data`, `/terms`, `/about`, `/audit`, 404.
6. Real-server run (`node scripts/serve.mjs 8787`, replay and injected) with `VITE_USE_MOCK` unset; confirm the responses match the fixtures for the same cases.
7. Accessibility, performance, print and network-panel verification report.
8. Copy check output and the owner's checklist below.

## 18.2 Acceptance checklist (the owner checks each by looking; 05b's ten items remain and are repeated here)
- [ ] The promise sentence is the first thing on the start screen, in full.
- [ ] The source tag is visible on every investigation; injected shows the hatched band and is distinguishable in greyscale.
- [ ] `confirmed`, `provisional_association`, `unresolved` look different; provisional shows the full notice in the open, in a dashed frame.
- [ ] `unknown` and `abstain` are neutral ink: no red, no green, never called an error.
- [ ] Both systems side by side, times labelled "observed at", `null` shown as "Not read".
- [ ] Every explanation statement has clickable evidence chips that open the drawer; the drawer shows the stored-copy hash note.
- [ ] Forbidden actions are listed with reasons; no control anywhere looks executable.
- [ ] Error responses never show a verdict; the ErrorPanel is the only place red appears.
- [ ] The build fails if any forbidden word appears in the UI source (show the passing and a deliberately failing run).
- [ ] All 17 fixtures render without console errors; 68 screenshots delivered.
- [ ] None of the 40 "looks AI-generated" items from Part 2 is present, with the table filled in.
- [ ] Light theme is the default and polished; dark theme passes the same checks.
- [ ] Zero third-party requests (network panel shown), no cookies, no analytics.
- [ ] `/data` and `/terms` exist and every sentence on them is true of the build.
- [ ] The home page contains a working recorded-case component, no logos strip, no testimonials, no pricing, no stats.
- [ ] The scene shows no digits and no real-looking IDs, carries its "not data" caption, pauses on request, and shows a static state under reduced motion.
- [ ] No Inter, Geist, Space Grotesk or icon library; the glyph set is custom.
- [ ] axe reports no serious or critical issues on any route.
- [ ] Keyboard-only walkthrough recorded or described step by step.
- [ ] Printing an investigation produces a clean one-page result with the source label and limits.

## 18.3 What to send back with the build
A zip or repository folder `ui/`; the 68 screenshots; the axe report; the network-panel check; the copy-check output; the filled 40-item table; `COPY-QUESTIONS.md` and `CONTRACT-QUESTIONS.md` (empty files are fine if there are no questions); and a short list of anything you could not do.

## 18.4 If you disagree with something here
Do not silently change it. Write the disagreement and your reason in `ui/COPY-QUESTIONS.md` or `ui/DESIGN-NOTES.md` and keep building to this specification until the owner answers.
