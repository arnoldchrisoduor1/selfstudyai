# Landing Page Overrides

> **PROJECT:** self-study-ai
> **Page Type:** Landing / Marketing
> **Copy source:** `docs/FEATURES.md` only — no invented claims, testimonials, or user counts.

> Rules here **override** `design-system/MASTER.md` for `apps/landing`.

---

## Layout

- **Max width:** 1200px (`max-w-[1200px]`), centered column.
- **Section order:** Header → Hero → How it works → Feature highlights → Product preview → Local-first → Pricing → FAQ → Download / Open app → Footer.
- **Vertical rhythm:** `py-3xl` between major sections; hero `pt-3xl pb-2xl`.
- **Grid:** 1 column mobile; 2–3 columns from `md`/`lg` where noted below.

---

## Typography

- Lexend (`font-heading`) for display and section titles.
- Source Sans 3 (`font-sans`) for body — minimum 16px.
- Hero title: `text-4xl` → `lg:text-5xl`, semibold.
- Section titles: `text-3xl`, semibold.
- No motion until content existed; keep transitions to opacity/color only. Respect `prefers-reduced-motion`.

---

## Section specs

### Header

- Wordmark “Self Study” (text, not a bespoke logo asset).
- In-page anchor links: Features, How it works, Pricing, FAQ.
- Primary CTA: “Open app” (placeholder href from `NEXT_PUBLIC_APP_URL` or labeled placeholder).

### Hero

- H1: **Self Study**
- Subhead: local-first study from your notes and books — questions, FSRS review, tests, optional cloud sync.
- Two actions: Open app (placeholder), Learn how it works (anchor).
- `data-testid="landing-home"` on `<main>`.

### How it works

Four steps, numbered cards:

1. Add subjects and upload sources.
2. Search and organize topics.
3. Study in bursts with graded feedback.
4. Review on a schedule (FSRS) and take tests.

### Feature highlights

Six cards tied to shipped features: ingest/search, AI providers, study sessions, FSRS + points, tests/integrity, optional accounts/sync/credits.

### Product preview

Composed **real UI components** from `@self-study/ui` with static demo props (QuestionCard, BurstProgress, StatCard, ScoreBadge). Card on `bg-card` with border; reads as product chrome, not a photograph.

### Local-first and privacy

- SQLite default; data on device for desktop/local API.
- Accounts optional; sync and cloud AI only when signed in.
- No fabricated security certifications.

### Pricing

Two tiers (factual):

- **Local** — Free; your API keys or mock provider; no account required.
- **Cloud credits** — Prepaid ledger for platform-hosted AI when signed in; top-up via mock payment + admin adjust today (no real checkout).

### FAQ

Six–eight questions: local-only use, keys vs cloud AI, sync, credits/payments placeholder, desktop availability, CI status.

### Download / Open app

- **Open app:** button/link with placeholder URL and visible “placeholder” hint.
- **Download desktop:** disabled or secondary control labeled placeholder until release builds exist.

### Footer

- Links: Privacy (`/privacy/`), Terms (`/terms/`) — placeholder legal pages.
- One line: static marketing site; product app is separate.

---

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Home (sections above) |
| `/privacy/` | Privacy policy placeholder |
| `/terms/` | Terms placeholder |

---

## SEO (static export)

- Per-page `<Head>`: title, description, canonical, Open Graph, Twitter card.
- `public/robots.txt`, `public/sitemap.xml` (paths `/`, `/privacy/`, `/terms/`).
- JSON-LD `SoftwareApplication` on home; honest `applicationCategory` EducationalApplication; no fake ratings.

---

## Components (`apps/landing/src/components/`)

- `LandingHeader` — top nav and CTA.
- `LandingFooter` — legal links.
- `SectionHeading` — eyebrow, title, description.
- `FaqItem` — one FAQ row (button for expand if needed; use shared `Button` only when interactive).

All section bodies live in `apps/landing/src/sections/`. Shared controls from `@self-study/ui` only.