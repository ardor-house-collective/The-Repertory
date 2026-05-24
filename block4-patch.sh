#!/bin/bash
# block4-patch.sh
# Run from: /Users/koyaanaredstar26/gns-database/
# Usage: bash block4-patch.sh

set -e
DB="/Users/koyaanaredstar26/gns-database"

echo "→ Patching contributor-form.html..."

# 1. Rename tier badge CSS classes
sed -i \
  -e 's/\.tier-pro          { background: #1565c0; }/.tier-associate  { background: #1565c0; }/' \
  -e 's/\.tier-intelligence { background: #6a1b9a; }/.tier-certified  { background: #6a1b9a; }/' \
  -e 's/\.tier-enterprise   { background: var(--navy); }/.tier-accredited { background: var(--navy); }/' \
  "$DB/contributor-form.html"

# 2. Update founding check in contributor-form populatePanel()
python3 << 'PYEOF'
path = '/Users/koyaanaredstar26/gns-database/contributor-form.html'
with open(path) as f:
    c = f.read()

old = """    if (p.membership_tier === 'founding') {
      document.querySelectorAll('.nav-founding').forEach(el => el.classList.add('nav-visible'))
    }"""

new = """    const isFoundingUser = p.membership_tier === 'founding' || p.is_curator_general
    if (isFoundingUser) {
      document.querySelectorAll('.nav-founding').forEach(el => el.classList.add('nav-visible'))
    }
    if (p.reviewer_role) {
      document.querySelectorAll('.nav-reviewer').forEach(el => el.classList.add('nav-visible'))
    }"""

if old in c:
    c = c.replace(old, new)
    with open(path, 'w') as f:
        f.write(c)
    print("  ✓ contributor-form.html founding check updated")
else:
    print("  ⚠ contributor-form.html: founding check not found")
PYEOF

# 3. Add Index link to nav dropdown in contributor-form.html
python3 << 'PYEOF'
path = '/Users/koyaanaredstar26/gns-database/contributor-form.html'
with open(path) as f:
    c = f.read()

old = '          <a href="condition-standard.html" class="nav-dropdown-item">Condition Standard</a>\n          <a href="admin-glossary.html" class="nav-dropdown-item nav-founding">Glossary</a>'
new = '          <a href="condition-standard.html" class="nav-dropdown-item">Condition Standard</a>\n          <a href="repertory-index.html" class="nav-dropdown-item">Index</a>\n          <a href="admin-glossary.html" class="nav-dropdown-item nav-founding">Glossary</a>'

if old in c:
    c = c.replace(old, new)
    with open(path, 'w') as f:
        f.write(c)
    print("  ✓ contributor-form.html Index nav link added")
else:
    print("  ⚠ contributor-form.html: nav dropdown not found — check manually")
PYEOF

echo "→ Patching resources.html..."

# 4. Update founding check in resources.html
python3 << 'PYEOF'
path = '/Users/koyaanaredstar26/gns-database/resources.html'
with open(path) as f:
    c = f.read()

old = """    if (p.membership_tier === 'founding') {
      document.querySelectorAll('.nav-founding').forEach(function(el) { el.classList.add('nav-visible') })
    }"""

new = """    const isFoundingUser = p.membership_tier === 'founding' || p.is_curator_general
    if (isFoundingUser) {
      document.querySelectorAll('.nav-founding').forEach(function(el) { el.classList.add('nav-visible') })
    }
    if (p.reviewer_role) {
      document.querySelectorAll('.nav-reviewer').forEach(function(el) { el.classList.add('nav-visible') })
    }"""

if old in c:
    c = c.replace(old, new)
    with open(path, 'w') as f:
        f.write(c)
    print("  ✓ resources.html founding check updated")
else:
    print("  ⚠ resources.html: founding check not found")

# 5. Add Index nav link
old2 = '          <a href="condition-standard.html" class="nav-dropdown-item">Condition Standard</a>\n          <a href="admin-glossary.html" class="nav-dropdown-item nav-founding">Glossary</a>'
new2 = '          <a href="condition-standard.html" class="nav-dropdown-item">Condition Standard</a>\n          <a href="repertory-index.html" class="nav-dropdown-item">Index</a>\n          <a href="admin-glossary.html" class="nav-dropdown-item nav-founding">Glossary</a>'

with open(path) as f:
    c = f.read()

if old2 in c:
    c = c.replace(old2, new2)
    with open(path, 'w') as f:
        f.write(c)
    print("  ✓ resources.html Index nav link added")
else:
    print("  ⚠ resources.html: nav dropdown not found")

# 6. Add Index resource card to resources grid
old3 = '  </div>\n\n</main>'
new3 = '''    <!-- ── The Repertory Index ── -->
    <div class="resource-card">
      <svg class="resource-card-icon" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="5" y="3" width="26" height="30" rx="3" stroke="currentColor" stroke-width="1.8" fill="none"/>
        <line x1="11" y1="11" x2="25" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="11" y1="16" x2="19" y2="16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="11" y1="21" x2="22" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="11" y1="26" x2="17" y2="26" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <h2 class="resource-card-title">The Repertory Index</h2>
      <p class="resource-card-desc">A complete reference of all designations, tiers, reviewer roles, certifications, and collective terms used across The Repertory. The canonical definition document for the platform&rsquo;s internal language.</p>
      <div class="resource-card-footer">
        <a href="repertory-index.html" class="resource-open-link">
          Open
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </a>
      </div>
    </div>

  </div>

</main>'''

with open(path) as f:
    c = f.read()

if old3 in c:
    c = c.replace(old3, new3)
    with open(path, 'w') as f:
        f.write(c)
    print("  ✓ resources.html Index card added to grid")
else:
    print("  ⚠ resources.html: grid end not found — add Index card manually")
PYEOF

echo "→ Patching condition-standard.html..."

# 7. Update founding check in condition-standard.html
python3 << 'PYEOF'
path = '/Users/koyaanaredstar26/gns-database/condition-standard.html'
with open(path) as f:
    c = f.read()

old = """    if (p.membership_tier === 'founding') {
      document.querySelectorAll('.nav-founding').forEach(function(el) { el.classList.add('nav-visible') })
    }"""

new = """    const isFoundingUser = p.membership_tier === 'founding' || p.is_curator_general
    if (isFoundingUser) {
      document.querySelectorAll('.nav-founding').forEach(function(el) { el.classList.add('nav-visible') })
    }
    if (p.reviewer_role) {
      document.querySelectorAll('.nav-reviewer').forEach(function(el) { el.classList.add('nav-visible') })
    }"""

if old in c:
    c = c.replace(old, new)
    with open(path, 'w') as f:
        f.write(c)
    print("  ✓ condition-standard.html founding check updated")
else:
    print("  ⚠ condition-standard.html: founding check not found")

# 8. Add Index nav link
old2 = '          <a href="condition-standard.html" class="nav-dropdown-item active">Condition Standard</a>\n          <a href="admin-glossary.html" class="nav-dropdown-item nav-founding">Glossary</a>'
new2 = '          <a href="condition-standard.html" class="nav-dropdown-item active">Condition Standard</a>\n          <a href="repertory-index.html" class="nav-dropdown-item">Index</a>\n          <a href="admin-glossary.html" class="nav-dropdown-item nav-founding">Glossary</a>'

with open(path) as f:
    c = f.read()

if old2 in c:
    c = c.replace(old2, new2)
    with open(path, 'w') as f:
        f.write(c)
    print("  ✓ condition-standard.html Index nav link added")
else:
    print("  ⚠ condition-standard.html: nav dropdown not found")
PYEOF

echo ""
echo "--- Verify ---"
grep -c 'tier-associate\|is_curator_general\|reviewer_role' \
  "$DB/contributor-form.html" "$DB/resources.html" "$DB/condition-standard.html"

grep -c 'index.html' \
  "$DB/contributor-form.html" "$DB/resources.html" "$DB/condition-standard.html"
