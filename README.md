# Threadly

Threadly is a Tauri desktop app for managing a personal wardrobe with local-first storage, image processing, and AI-assisted clothing insights.

## Tech Stack

- **Desktop runtime:** Tauri 2 (Rust backend)
- **Frontend:** React 19 + TypeScript + Vite 7
- **Styling:** Tailwind CSS v4
- **Database:** SQLite via `@tauri-apps/plugin-sql` + Drizzle ORM
- **AI:** Gemini Flash API (optional for analysis features)

## Features

- Upload and catalog clothing items
- Local image pipeline (originals, processed images, thumbnails)
- Background-removal support via `rembg` (with safe fallback when unavailable)
- AI-based clothing analysis and wardrobe gap insights
- Outfit and wishlist management

## Project Structure

```text
.
├── src/                  # React app (pages, components, hooks, lib)
├── src-tauri/            # Tauri/Rust backend and command handlers
├── drizzle/              # DB schema + SQL migrations
└── docs/architecture.md  # Detailed architecture notes
```

## Prerequisites

- Node.js 20+
- npm 10+
- Rust toolchain (stable) and Tauri build dependencies
- Linux desktop environment (current primary target)
- Optional: `rembg` CLI for best background-removal output

## Environment Setup

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
2. Set your Gemini key in `.env`:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

If no API key is set, AI analysis features will fail with a clear runtime error.

## Install and Run

```bash
npm install
npm run tauri dev
```

## Scripts

- `npm run dev` — run Vite dev server (frontend only)
- `npm run tauri dev` — run full desktop app in development
- `npm run build` — type-check and build frontend assets
- `npm run test:run` — run tests once
- `npm run lint` — run ESLint
- `npm run format` — format frontend files with Prettier

## Data Storage

Threadly stores application data in the Tauri local app data directory (including SQLite DB and image assets). Nothing is uploaded by default except requests you explicitly make to Gemini for AI analysis.

## Documentation

- Architecture details: `/home/runner/work/Threadly/Threadly/docs/architecture.md`
