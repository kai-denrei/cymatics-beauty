# v3/ — Phase 3

Audio-reactive driver. Empty until Phase 3 begins.

Two paths:

- **Path A (primary, clean):** uploaded audio → Web Audio API FFT → matcher
  → crossfade between modes in `fem/out/modebank.json`.
- **Path B (optional, local-only, caveated):** `ingest_youtube.py` wraps
  `yt-dlp` to pull bestaudio → wav. **Opt-in via explicit CLI flag.**
  Downloading YouTube audio may violate YouTube's Terms of Service and the
  rights of the audio's owner. This helper is for **local, personal R&D on
  content you have the right to use** (your own uploads, CC-licensed,
  public-domain, or material you are licensed for). Audio cache is
  gitignored (`v3/audio_cache/`).
