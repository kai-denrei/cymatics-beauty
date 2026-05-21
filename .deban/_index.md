---
project: cymatics
created: 2026-05-21
status: active
mode: solo
stale_threshold_days: 30
---

# cymatics — Index

## Brief

Interactive cymatics tool, built in three honest stages. **v1**: vanilla HTML5 + Canvas 2D toy field — square-membrane superposition `cos(nπx/L)·cos(mπy/L) − cos(mπx/L)·cos(nπy/L)`, labelled in code as the physics cheat. Buildless, ≥100k particles target. **v2**: scikit-fem biharmonic eigensolve on Kirchhoff–Love plate, free-edge natural BC, exports `modebank.json` to v1. **v3**: audio-reactive — uploaded tracks first, optional local YouTube ingest behind a CLI flag. Spec lives in `CYMATICS_BUILD.md`. Goal of this session: working V1 on localhost.

## Active Roles
- [[dev]] — owner: gerald
- [[arch]] — owner: gerald
- [[pm]] — owner: gerald
- [[ux]] — owner: gerald
- [[qa]] — owner: gerald
- [[devops]] — owner: gerald

## Key Decisions
<!-- Cross-role summary, maintained by COMPACT -->

## Open Questions (cross-role)
- [ ] Can Canvas 2D actually sustain ≥100k particles at 60fps on M-series? Spec asserts; not yet measured. — see [[dev]], [[qa]]
- [ ] How does the cache-busting on-save watcher coexist with the buildless v1 constraint? — see [[devops]], [[arch]]
