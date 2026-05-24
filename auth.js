/**
 * auth.js — The Repertory
 * Shared authentication and access control module.
 *
 * Storage: reads gns_access_token + gns_user from localStorage,
 * matching the existing site-wide pattern in dashboard.html, admin-review.html, etc.
 *
 * Usage (ES module):
 *   import { loadProfile, gateElement, requireAuth, applyFoundingNav } from './auth.js'
 *
 *   const profile = await requireAuth()   // redirects to login.html if not authenticated
 *   if (profile.membership_tier === 'founding') applyFoundingNav()
 *
 *   gateElement(document.getElementById('market-data'), {
 *     requiredTier: 'associate',
 *     mode: 'lock',
 *     label: 'Associate'
 *   })
 */

// ── Configuration ──────────────────────────────────────────────────────────────

export const SUPABASE_URL      = 'https://hsseypuhqdlcvepgyrtd.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_WOh4vQeiGzrN9CoICfiUTQ_XB5MQJw0'

// ── Tier + reviewer hierarchy ──────────────────────────────────────────────────

const TIER_RANK = {
  free:       0,
  associate:  1,
  certified:  2,
  accredited: 3,
  founding:   4,
}

const REVIEWER_RANK = {
  provisional: 1,
  credentialed: 2,
  founding:        3,
}

// ── Internal state ─────────────────────────────────────────────────────────────

let _profile = null
let _loading = null

// ── Storage helpers ────────────────────────────────────────────────────────────
// Matches existing gns_access_token / gns_user pattern used across the site

export function getStoredToken() {
  return localStorage.getItem('gns_access_token')
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('gns_user') || 'null')
  } catch {
    return null
  }
}

export function signOut(redirectTo = 'login.html') {
  localStorage.removeItem('gns_access_token')
  localStorage.removeItem('gns_refresh_token')
  localStorage.removeItem('gns_user')
  window.location.href = redirectTo
}

export function dbHeaders() {
  const token = getStoredToken()
  return {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json',
  }
}

// ── Profile loading ────────────────────────────────────────────────────────────

/**
 * Load the current user's contributor profile.
 * Fetches once and caches for the page lifetime.
 * Returns null if unauthenticated or profile not found.
 */
export async function loadProfile() {
  if (_profile) return _profile
  if (_loading) return _loading

  _loading = (async () => {
    try {
      const token = getStoredToken()
      const user  = getStoredUser()
      if (!token || !user?.id) return null

      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/contributor_profile` +
        `?auth_user_id=eq.${encodeURIComponent(user.id)}` +
        `&select=id,contributor_id,display_name,membership_tier,reviewer_role,` +
        `is_curator_general,authenticator_status,trust_level,approval_status,created_at` +
        `&limit=1`,
        { headers: dbHeaders() }
      )

      if (!res.ok) return null
      const rows = await res.json()
      _profile   = rows?.[0] ?? null
      return _profile
    } catch {
      return null
    } finally {
      _loading = null
    }
  })()

  return _loading
}

export async function getProfile() {
  return _profile ?? await loadProfile()
}

// ── Access checks ──────────────────────────────────────────────────────────────

export async function isCuratorGeneral() {
  const p = await getProfile()
  return p?.is_curator_general === true
}

export async function isFoundingOrAbove() {
  const p = await getProfile()
  return p?.membership_tier === 'founding' || p?.is_curator_general === true
}

export async function isReviewer() {
  const p = await getProfile()
  return !!p?.reviewer_role
}

/**
 * True if user's tier >= minTier.
 * Founding and curator_general always pass.
 */
export async function tierAtLeast(minTier) {
  const p = await getProfile()
  if (!p) return false
  if (p.is_curator_general || p.membership_tier === 'founding') return true
  return (TIER_RANK[p.membership_tier] ?? 0) >= (TIER_RANK[minTier] ?? 99)
}

/**
 * True if user's reviewer_role >= minRole.
 * curator_general always passes.
 */
export async function hasReviewerRole(minRole) {
  const p = await getProfile()
  if (!p) return false
  if (p.is_curator_general) return true
  return (REVIEWER_RANK[p.reviewer_role] ?? 0) >= (REVIEWER_RANK[minRole] ?? 99)
}

export async function isCertifiedAuthenticator() {
  const p = await getProfile()
  return p?.authenticator_status === 'certified'
}

export async function canReviewAuthentication() {
  const p = await getProfile()
  if (!p) return false
  if (p.is_curator_general || p.membership_tier === 'founding') return true
  return (
    (REVIEWER_RANK[p.reviewer_role] ?? 0) >= REVIEWER_RANK['credentialed']
    && p.authenticator_status === 'certified'
  )
}

// ── Page guards ────────────────────────────────────────────────────────────────

/**
 * Redirect unauthenticated or inactive users to login.
 * Returns the profile if authenticated, null otherwise.
 */
export async function requireAuth(loginPage = 'login.html') {
  const token = getStoredToken()
  const user  = getStoredUser()
  if (!token || !user?.id) {
    window.location.replace(loginPage)
    return null
  }
  const p = await loadProfile()
  if (!p || p.approval_status !== 'active') {
    window.location.replace(loginPage)
    return null
  }
  return p
}

/**
 * Redirect non-founding users away from admin pages.
 * Returns true if access granted.
 */
export async function requireFounding(redirectPage = 'dashboard.html') {
  const p = await loadProfile()
  if (!p || (p.membership_tier !== 'founding' && !p.is_curator_general)) {
    window.location.replace(redirectPage)
    return false
  }
  return true
}

export async function requireReviewerRole(minRole, redirectPage = 'dashboard.html') {
  const ok = await hasReviewerRole(minRole)
  if (!ok) window.location.replace(redirectPage)
  return ok
}

// ── UI gating ──────────────────────────────────────────────────────────────────

/**
 * Gate a DOM element by tier, reviewer role, or certification status.
 *
 * @param {HTMLElement} el
 * @param {Object} opts
 * @param {string}  [opts.requiredTier]          - Minimum membership tier
 * @param {string}  [opts.requiredReviewerRole]  - Minimum reviewer role
 * @param {boolean} [opts.requireCertified]      - Requires authenticator_status = 'certified'
 * @param {'hide'|'lock'} [opts.mode]            - 'hide' removes from DOM; 'lock' disables with badge
 * @param {string}  [opts.label]                 - Label shown on locked badge
 */
export async function gateElement(el, {
  requiredTier,
  requiredReviewerRole,
  requireCertified = false,
  mode  = 'lock',
  label = '',
} = {}) {
  if (!el) return

  const tierOk     = requiredTier         ? await tierAtLeast(requiredTier)             : true
  const reviewerOk = requiredReviewerRole ? await hasReviewerRole(requiredReviewerRole) : true
  const certOk     = requireCertified     ? await isCertifiedAuthenticator()            : true

  if (tierOk && reviewerOk && certOk) return  // access granted, do nothing

  if (mode === 'hide') {
    el.remove()
    return
  }

  el.classList.add('feature-locked')
  el.setAttribute('disabled',      'true')
  el.setAttribute('aria-disabled', 'true')
  el.setAttribute('tabindex',      '-1')

  if (label) {
    const badge = document.createElement('span')
    badge.className   = 'tier-badge'
    badge.textContent = label
    el.appendChild(badge)
  }

  el.addEventListener('click',   e => e.preventDefault(), { capture: true })
  el.addEventListener('keydown', e => e.preventDefault(), { capture: true })
}

export async function gateElements(items) {
  await Promise.all(items.map(({ el, opts }) => gateElement(el, opts)))
}

/**
 * Auto-gate all elements with class 'tier-gated' using data attributes.
 *
 * HTML:
 *   <div class="tier-gated" data-gate-tier="associate" data-gate-mode="lock" data-gate-label="Associate">
 */
export async function applyPageGates() {
  const gated = document.querySelectorAll('.tier-gated')
  await Promise.all([...gated].map(el => gateElement(el, {
    requiredTier:         el.dataset.gateTier  || undefined,
    requiredReviewerRole: el.dataset.gateRole  || undefined,
    requireCertified:     el.dataset.gateCert  === 'true',
    mode:                 el.dataset.gateMode  || 'lock',
    label:                el.dataset.gateLabel || '',
  })))
}

// ── Nav helpers ────────────────────────────────────────────────────────────────

/**
 * Show founding-only nav links and action cards.
 * Uses the existing action-founding / nav-founding CSS class pattern.
 */
export function applyFoundingNav() {
  document.querySelectorAll('.action-founding').forEach(el => el.classList.add('action-visible'))
  document.querySelectorAll('.nav-founding').forEach(el => el.classList.add('nav-visible'))
}

/**
 * Show reviewer nav elements for users with any reviewer role.
 */
export function applyReviewerNav() {
  document.querySelectorAll('.nav-reviewer').forEach(el => el.classList.add('nav-visible'))
  document.querySelectorAll('.action-reviewer').forEach(el => el.classList.add('action-visible'))
}

// ── Tier display ───────────────────────────────────────────────────────────────

const TIER_DISPLAY = {
  free:       'Free',
  associate:  'Associate',
  certified:  'Certified',
  accredited: 'Accredited',
  founding:   'Founding',
}

export function tierLabel(tier) {
  return TIER_DISPLAY[tier] || tier || '—'
}

// ── CSS injection ──────────────────────────────────────────────────────────────

export function injectGatingStyles() {
  if (document.getElementById('repertory-gate-styles')) return
  const style = document.createElement('style')
  style.id = 'repertory-gate-styles'
  style.textContent = `
    .feature-locked {
      opacity: 0.4;
      pointer-events: none;
      cursor: not-allowed;
      user-select: none;
    }
    .tier-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      padding: 2px 7px;
      border-radius: 3px;
      background: #264E36;
      color: #F4F0EC;
      margin-left: 8px;
      vertical-align: middle;
      line-height: 1.4;
    }
    .tier-associate  { background: #1565c0; }
    .tier-certified  { background: #6a1b9a; }
    .tier-accredited { background: #1B2E4B; }
    .tier-founding   { background: #B5622A; }
    .tier-free       { background: #757575; }
  `
  document.head.appendChild(style)
}
