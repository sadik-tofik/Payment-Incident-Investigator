#!/usr/bin/env bash
# Run from the repository root BEFORE every push. Fails if anything looks like a secret or raw evidence is about to be committed.
set -u
fail=0
echo "1. Secret-looking strings in tracked + untracked files (excluding .git, node_modules, build output). Only file:line is printed, never the matched text:"
EXCL="--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude=package-lock.json"
hits=$( { grep -rInE "(ck_[0-9a-f]{20,}|cs_[0-9a-f]{20,}|A21AA[A-Za-z0-9_-]{20,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|(client_)?secret[\"']?\s*[:=]\s*[\"'][A-Za-z0-9_-]{16,}[\"']|Bearer [A-Za-z0-9._-]{20,})" $EXCL . | grep -v "FAKE-TEST-VALUE";
  grep -rInP "(?<![A-Za-z0-9_-])(?![0-9a-f]{60,}(?![A-Za-z0-9_-]))[A-Za-z0-9_-]{70,}(?![A-Za-z0-9_-])" $EXCL . | grep -v "FAKE-TEST-VALUE";
  grep -rInEi "^[[:space:]]*(secret key|client secret|client id|password)[[:space:]]*[0-9]*[[:space:]]*[:=]?[[:space:]]*$" $EXCL . ; } | cut -d: -f1,2 | sort -u )
if [ -n "$hits" ]; then echo "$hits"; echo "   ^ possible credentials. Delete or move them out of the repository, and rotate any real credential."; fail=1; else echo "   none found"; fi
echo "2. raw/ or out/ directories, zips, env files:"
if find . -path ./.git -prune -o \( -type d \( -name raw -o -name out \) -o -name "*.zip" -o -name ".env" -o -name ".env.*" \) -print | grep -v '\.env\.example' | grep .; then fail=1; else echo "   none found"; fi
echo "3. Email addresses in evidence (sandbox buyer emails must not be committed):"
if grep -rInE "[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[a-z]{2,}" evidence 2>/dev/null; then fail=1; else echo "   none found"; fi
echo "4. History (all commits, all branches) for the same patterns (only runs inside a Git repository; otherwise it checks nothing):"
git rev-parse --git-dir >/dev/null 2>&1 || echo "   NOT A GIT REPOSITORY: history was NOT scanned"
if git rev-parse --git-dir >/dev/null 2>&1 && git log --all -p 2>/dev/null | grep -nE "(ck_[0-9a-f]{20,}|cs_[0-9a-f]{20,}|A21AA[A-Za-z0-9_-]{20,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY)" | head; then :; fi
echo "5. Claims audit (phrase and reference guard, not a truth check):"
if node "$(dirname "$0")/claims-audit.mjs"; then :; else fail=1; fi
[ "$fail" = 0 ] && echo "RESULT: clean" || echo "RESULT: FIX THE ITEMS ABOVE BEFORE PUSHING"
exit $fail
