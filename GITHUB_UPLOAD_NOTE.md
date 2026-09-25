# GitHub upload-ready copy

This folder is a cleaned copy of the Dungeon Bluff development project for GitHub version control.

Excluded from this copy:
- `node_modules/`
- `supabase/.temp/`
- `.env` and `.env.*`
- `.test-results.txt`
- large raster/audio media (`png`, `jpg`, `jpeg`, `webp`, `gif`, `mp3`, `wav`, `ogg`)

Kept intentionally:
- frontend source (`src/`, HTML/CSS/config)
- tests and scripts
- docs
- lightweight SVG assets
- `supabase/functions/`
- `supabase/migrations/`
- `supabase/config.toml`
- Supabase diagnostic/setup SQL scripts
- package manifests and `.gitignore`
