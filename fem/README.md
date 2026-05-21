# fem/ — Phase 2

The real Kirchhoff–Love plate eigensolve. Empty until Phase 2 begins.

When Phase 2 starts:

```bash
cd fem
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m fem.cli solve --bc free --mesh fine
```

See `CYMATICS_BUILD.md` §Phase 2 for the full plan. Do **not** preempt this
phase from v1 by adding a Python server dependency — the two stages
communicate exclusively through `fem/out/modebank.json`.
