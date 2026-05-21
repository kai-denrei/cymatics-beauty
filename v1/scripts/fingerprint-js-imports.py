#!/usr/bin/env python3
"""
Append or update `?v=<token>` on every same-origin ES-module import inside
.js files. Complements the existing HTML/CSS fingerprinter (which doesn't
touch JS), so a cache-bust actually propagates through the module graph.

Rewrites three forms (relative same-origin paths only):

    import … from "./X.js"             → import … from "./X.js?v=TOKEN"
    import("./X.js")                    → import("./X.js?v=TOKEN")
    new URL("./X.js", import.meta.url)  → new URL("./X.js?v=TOKEN", import.meta.url)

Skips external URLs, absolute paths starting with /, and anything that
doesn't end in `.js`. Idempotent — running twice with the same token is a
no-op. Backups: writes in place; rely on git.

Why this exists: the cache-busting toolkit's `fingerprint-urls.py` only
walks .html/.htm/.css. ES module imports inside JS files therefore never
got a `?v=` and were cached forever by the browser's module map. A fix to
any non-entrypoint module silently failed to reach existing users.

Usage:
    python3 fingerprint-js-imports.py <token> [--target <dir>]
"""

import argparse
import os
import re
import sys
from pathlib import Path


DEFAULT_SKIP_DIRS = {
    "node_modules", ".git", "dist", "build", "out",
    ".next", ".nuxt", ".cache", ".vite", ".svelte-kit",
    "cb-shapes",
}

# Matches:    from "./foo.js"     or    from './foo.js'
# Groups:    (prefix=`from "`)(url)(suffix=`"`)
IMPORT_FROM_PATTERN = re.compile(
    r'(\bfrom\s+["\'])(\.{1,2}/[^"\']+?\.js)(["\'])'
)

# Matches:    import("./foo.js")
IMPORT_DYNAMIC_PATTERN = re.compile(
    r'(\bimport\s*\(\s*["\'])(\.{1,2}/[^"\']+?\.js)(["\']\s*\))'
)

# Matches:    new URL("./foo.js", import.meta.url)
# Or:         new URL('./foo.js', import.meta.url)
WORKER_URL_PATTERN = re.compile(
    r'(\bnew\s+URL\s*\(\s*["\'])(\.{1,2}/[^"\']+?\.js)(["\']\s*,\s*import\.meta\.url\s*\))'
)


def apply_token(url, token):
    """Append or replace `v=<token>` query parameter, preserving the rest."""
    frag = ""
    if "#" in url:
        url, frag = url.split("#", 1)
        frag = "#" + frag
    if "?" in url:
        path, query = url.split("?", 1)
        parts = [p for p in query.split("&") if p and not p.startswith("v=")]
        parts.append("v=" + token)
        return path + "?" + "&".join(parts) + frag
    return url + "?v=" + token + frag


def rewrite(content, token):
    changes = [0]

    def repl(m):
        prefix, url, suffix = m.group(1), m.group(2), m.group(3)
        new_url = apply_token(url, token)
        if new_url != url:
            changes[0] += 1
        return prefix + new_url + suffix

    new = IMPORT_FROM_PATTERN.sub(repl, content)
    new = IMPORT_DYNAMIC_PATTERN.sub(repl, new)
    new = WORKER_URL_PATTERN.sub(repl, new)
    return new, changes[0]


def walk_target(target, skip_dirs):
    for root, dirs, files in os.walk(target):
        dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith(".")]
        for f in files:
            yield Path(root) / f


def main():
    ap = argparse.ArgumentParser(description="Fingerprint ES-module imports with ?v=<token>")
    ap.add_argument("token", help="cache-bust token, e.g. cbd1dddb")
    ap.add_argument("--target", default=".", help="project root (default: .)")
    ap.add_argument("--quiet", action="store_true", help="suppress per-file output")
    args = ap.parse_args()

    target = Path(args.target).resolve()
    if not target.is_dir():
        sys.exit("target directory does not exist: " + str(target))

    n_files, n_changes = 0, 0
    for f in walk_target(target, set(DEFAULT_SKIP_DIRS)):
        if f.suffix.lower() != ".js":
            continue
        try:
            content = f.read_text(errors="replace")
        except OSError:
            continue
        new, changes = rewrite(content, args.token)
        if changes and new != content:
            f.write_text(new)
            n_files += 1
            n_changes += changes
            if not args.quiet:
                print("  ✓ " + str(f.relative_to(target)) + " (" + str(changes) + " imports)")

    print("\nfingerprinted " + str(n_changes) + " imports across " + str(n_files) +
          " JS files with v=" + args.token)


if __name__ == "__main__":
    main()
