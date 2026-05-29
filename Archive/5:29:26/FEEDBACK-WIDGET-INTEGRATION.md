# GNS Feedback Widget — Integration Guide

Two output files to deploy:
- `feedback-widget.html` — the widget itself (goes on all 7 pages)
- `admin-feedback-section.html` — admin view (goes into admin-review.html only)

---

## Step 1 — All 7 pages: add the widget

Open each page listed below. Find the closing `</body>` tag.
Paste the entire contents of `feedback-widget.html` immediately before `</body>`.

**Pages:**
1. `login.html`
2. `signup.html`
3. `request-access.html`
4. `dashboard.html`
5. `contributor-form.html`
6. `admin-review.html`
7. `admin-glossary.html`

The widget reads `window._supabaseClient` — the same client your pages already initialize.
As long as your pages do something like:

```js
window._supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

…the widget will connect automatically. No other changes needed on these 6 pages.

---

## Step 2 — admin-review.html: add the feedback tab

### 2a. Add the tab button

Find your existing tab button group. Add this button:

```html
<button class="tab-btn" data-tab="feedback">
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
  Feedback
  <span id="fb-new-badge" style="
    display:none;
    background:#B5622A;
    color:#FAF6F0;
    font-size:10px;
    border-radius:9px;
    padding:1px 6px;
    margin-left:4px;
  "></span>
</button>
```

The `fb-new-badge` span auto-populates with the count of "new" status entries
and hides itself when there are none.

### 2b. Add the panel

Paste the entire contents of `admin-feedback-section.html` inside your tab panels
container, alongside your existing panels.

### 2c. Hook into your tab switcher

Your existing tab switcher likely does something like:

```js
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const tab = this.dataset.tab;
    // show/hide panels ...
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(tab + '-panel').classList.add('active');
  });
});
```

Add one line inside that handler:

```js
if (tab === 'feedback') {
  window.initFeedbackAdmin && window.initFeedbackAdmin();
}
```

`initFeedbackAdmin()` is safe to call multiple times — it re-fetches on each call,
so switching away and back gets fresh data.

### 2d. Wire `initFeedbackAdmin` after page load

At the bottom of your existing page init block (after the supabase client is ready),
add:

```js
// Feedback admin — initializes lazily on first tab open
// No action needed here unless you want it pre-loaded on page open.
// If you do, call:
// window.initFeedbackAdmin && window.initFeedbackAdmin();
```

The MutationObserver in the panel will also call it automatically the first time
the panel's `active` class is added, so this step is optional.

---

## Supabase: what was created

### Table: `public.feedback`

| Column          | Type        | Notes                          |
|-----------------|-------------|--------------------------------|
| id              | uuid        | PK, auto-generated             |
| page            | text        | from document.title            |
| feedback_type   | text        | one of 5 dropdown values       |
| description     | text        | required                       |
| screenshot_url  | text        | nullable, public storage URL   |
| submitted_by    | text        | nullable, display name         |
| contributor_id  | uuid        | nullable, FK → contributor_profile |
| status          | text        | default 'new'                  |
| created_at      | timestamptz | default now()                  |

### RLS policies applied:
- **Anon + authenticated** can INSERT (widget works without login)
- **Authenticated** can SELECT (admin view)
- **Authenticated** can UPDATE (status changes)

### Storage bucket: `feedback-screenshots`
- Public bucket — uploaded files get a public URL stored in `screenshot_url`
- Anon + authenticated can upload
- Public read

---

## Troubleshooting

**Widget appears but submit fails with 401**
RLS insert policy for `anon` may not be active. Check:
```sql
SELECT * FROM pg_policies WHERE tablename = 'feedback';
```
Confirm the "Anyone can submit feedback" policy exists with `roles = {anon, authenticated}`.

**Screenshot upload fails silently**
The storage bucket policies may not have applied. Run:
```sql
SELECT * FROM pg_policies WHERE tablename = 'objects' AND policyname ILIKE '%feedback%';
```
If missing, re-run the migration or add them manually in the Supabase dashboard under
Storage → Policies.

**Name not pre-filling for logged-in users**
The widget looks for `window._supabaseClient`. If your pages initialize the client
under a different variable name, either:
- Rename it to `_supabaseClient`, or
- Add an alias: `window._supabaseClient = yourExistingClientVar;`
