# Threadly — Architecture

## Overview

Threadly is a Tauri 2 desktop application for Linux. It is a personal wardrobe manager with a premium fashion-app aesthetic. The frontend is React + TypeScript (Vite), the backend is Rust via Tauri commands, and all data lives locally on the user's machine.

## Stack

| Layer | Technology |
|---|---|
| Desktop framework | Tauri 2.0 |
| Frontend | React 19 + TypeScript + Vite 7 |
| Styling | Tailwind CSS v4 + custom design tokens |
| Animations | Framer Motion 12 |
| Routing | React Router v7 |
| Database | SQLite via tauri-plugin-sql |
| ORM | Drizzle ORM + drizzle-kit |
| Image storage | Local filesystem (Tauri app data dir) |
| Background removal | rembg (Python, invoked as subprocess) |
| AI analysis | Gemini Flash (free, 1500 req/day) |
| Testing | Vitest + React Testing Library |

## Application Data Directory

```
~/.local/share/Threadly/   (resolved via Tauri app_data_dir())
├── database.sqlite
├── originals/              raw uploads, never overwritten
├── processed/              transparent PNG after rembg
├── thumbnails/             WebP at 300px for grid display
├── exports/                ZIP backups
├── cache/                  AI response cache
└── logs/
```

## Database Schema

See `drizzle/schema.ts` for the authoritative source.

Key tables:
- `wardrobes` — supports multiple collections (one default "My Wardrobe" created on launch)
- `clothes` — all garment metadata, AI analysis status, image paths, checksum
- `tags`, `cloth_tags` — normalized many-to-many for tags
- `seasons`, `cloth_seasons` — normalized many-to-many for seasons
- `outfits`, `outfit_items` — saved outfit combinations
- `wishlist` — items suggested by Discover/Gap Analysis, with outfit unlock count

## Image Pipeline

```
User uploads image
  ↓
Rust: import_image() — UUID filename, copy to originals/, SHA-256 checksum
  ↓
Rust: remove_background() — spawns python3 -m rembg, writes to processed/
  ↓
Rust: generate_thumbnail() — image crate → 300px WebP → thumbnails/
  ↓
DB: update clothes row (paths, dimensions, ai_status=PENDING)
  ↓
AI: Gemini Flash analyzes processed/ image → structured JSON → DB
```

## AI Integration

### Clothing Analysis (Gemini Flash)
- Input: base64-encoded processed image
- Output: strict JSON (type, colors, pattern, material, fit, formality, season, occasion tags)
- Triggered: after background removal, can be skipped or re-triggered
- Cached: if ai_status = COMPLETED, skip unless explicitly re-run

### Outfit Suggestions (Gemini Flash)
- Input: wardrobe metadata list + occasion text
- Output: array of cloth UUIDs + style explanation

### Gap Analysis — Outfit Potential Scoring (LOCAL, no AI)
- Pure combinatorics: counts valid top+bottom pairs a hypothetical new item would unlock
- Compatibility rules: formality proximity, color harmony, season overlap
- Runs entirely in outfit-math.ts, no API call

### Gap Analysis — Other sections (Gemini Flash)
- Color Balance, Occasion Coverage, Seasonal Readiness, Event Planning, Style Expansion
- Triggered on demand (not automatic)

## Frontend Architecture

```
src/
├── components/
│   ├── ui/         AppLayout (sidebar), Button, Badge, Modal, Toast, Spinner
│   ├── wardrobe/   WardrobeGrid, ItemCard, ItemDetail
│   ├── outfit/     OutfitBoard, OutfitBuilder, OutfitCard
│   ├── discover/   GapAnalysis, ColorBalance, OccasionCoverage,
│   │               MissingEssentials, OutfitPotential, SeasonalReadiness,
│   │               SmartShoppingList
│   └── upload/     UploadZone, ProgressBar, MetadataForm
├── pages/          One file per route
├── lib/            db.ts, gemini.ts, tauri.ts, gap-analysis.ts, outfit-math.ts
├── hooks/          useWardrobe, useOutfits, useSearch, useGapAnalysis
└── tests/          Vitest test files (Gemini/rembg always mocked)
```

## Design System

See `src/index.css` for the authoritative token definitions.

- Light mode is primary — every screen designed light-first
- Dark mode uses warm tinted navy (#0E1528), not pure black inversion
- Navy (#112250) is brand/primary color
- Gold (#C6A75E) is used only for highlights and selected states
- Deep emerald (#1F5D4E) is the only success/confirmation color
- Cormorant Garamond for display headings only
- Inter for all body text, UI elements, buttons
- DM Mono for counts, metadata, technical strings

## Rust Backend (Tauri Commands)

```
src-tauri/src/commands/
├── fs.rs     setup_directories, import_image (UUID + checksum)
├── image.rs  remove_background (rembg subprocess), generate_thumbnail
└── db.rs     migration runner (applies Drizzle migration SQL on startup)
```

## Testing Strategy

- All Gemini API calls are mocked in tests
- rembg subprocess is mocked in tests
- Outfit potential scoring (outfit-math.ts) is purely deterministic — tested with edge cases
- Target: >80% coverage on all business logic
- UI tests: rendering + interaction (React Testing Library)
- Rust: integration tests in src-tauri/tests/

## Build Phases

| Phase | Deliverable |
|---|---|
| 0 | Scaffold + design tokens + window opens |
| 1 | Data layer (SQLite + Drizzle schema) |
| 2 | File & image management |
| 3 | Background removal (rembg) |
| 4 | AI clothing analysis (Gemini) |
| 5 | Core wardrobe UI |
| 6 | Outfit builder |
| 7 | Discover / Gap Analysis |
| 8 | Export & backup |
| 9 | Polish & performance |
