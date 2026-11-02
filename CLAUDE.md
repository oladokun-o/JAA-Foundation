# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Site for the Joseph Alabi Adewoye (JAA) Foundation, a community NGO serving Ijara-Isin and surrounding communities in Kwara State. It was built by Nxtedge Studio. Production is https://adewoyefoundation.org/, hosted on **Netlify**. `netlify.toml` publishes the repo root, and its only build step is `node tools/write-config.mjs`.

## Development

There is no package manager or test suite. The site is plain HTML/CSS/JS, one Netlify Function and two small Node tools.

- Static preview: `python3 -m http.server 8000`. `/api/contact` and the headers in `netlify.toml` aren't served by this server.
- Full preview including the function: `netlify dev`.
- Syntax check: `node --check main.js && node --check netlify/functions/contact.mjs`

## Architecture

- **Pages:**
  - `index.html` is the one-page landing site, with anchors `#about #purpose #legacy #trustees #faq #contact`.
  - `privacy/`, `terms/` and `accessibility/` are the legal pages.
  - `404.html` (Netlify serves it automatically), `error/` and `message-sent/` are status pages, marked `noindex`.
- **Shared header and footer:** these are copied into every page, because there's no templating. When you change them, change all seven pages. Sub-pages use root-absolute paths (`/#about`, `/assets/...`).
- `styles.css`: a single stylesheet for every page. Design tokens live on `:root`.
  - `--gold` is decorative only. Use `--gold-text` for text, so the contrast stays at 4.5:1 or above.
  - The motion section at the end is switched off by `prefers-reduced-motion`.
- `main.js`: shared by all pages. Every feature checks its elements exist before running.
  - Scroll reveals use `[data-reveal]`, or `[data-stagger]` on a container to reveal its children in turn. Reveal styles only apply under `html.js`, so content is visible without JS.
- `config.js`: generated on deploy by `tools/write-config.mjs` from Netlify env vars. The committed copy is the empty local default. WhatsApp uses `DEFAULT_WHATSAPP_NUMBER` in `main.js` (2348051888116) unless a `WHATSAPP_NUMBER` env var overrides it.
- `netlify/functions/contact.mjs` (`POST /api/contact`):
  - Sends the message through Resend's REST API, then a best-effort confirmation to the visitor. The confirmation deliberately doesn't echo the message back.
  - Spam is blocked with a honeypot field named `company`.
  - JSON requests (from `main.js`) get JSON back. Plain form posts (no JS) are redirected with a 303 to `/message-sent/` or `/error/?from=contact`.
  - Environment variables: `RESEND_API_KEY` (required), `CONTACT_TO_EMAIL` (default `adewoyefoundation@gmail.com`), `CONTACT_FROM_EMAIL` (default `noreply@send.nxtedgestudio.com`).

## Security, privacy and SEO constraints

- **No third-party requests.** Fonts (Inter, Cormorant Garamond) and Remix Icon are self-hosted in `assets/fonts/`.
  - The privacy policy and the Content Security Policy both depend on this, so don't add CDNs, analytics or embeds without updating both.
  - The icon font is a subset. After adding or removing any `ri-*` icon, run `npm install --no-save --no-package-lock subset-font@2 && node tools/subset-icons.mjs`.
- **CSP** (`netlify.toml`) allows only `'self'` plus a sha256 hash of the inline `<script>` in each `<head>` that adds the `js` class. If that line changes, recompute the hash (the command is in `netlify.toml`). Don't add inline scripts, `style=""` attributes or `on*` handlers.
- **Legal and SEO files to keep in sync:**
  - The privacy policy names the processors (Netlify, Resend, Gmail) and says the site uses no cookies. Update it if that changes.
  - `sitemap.xml`, `robots.txt`, `llms.txt` and `.well-known/security.txt` (its `Expires` date is 2027-11-02, so renew it).
  - The JSON-LD in `index.html`: the FAQ answers must match the visible FAQ text word for word.

## Conventions

- **Trustees:** the cards are the founder's children in birth order. #2, Olubunmi Akanbi Adewoye, is deceased and uses the `trustee--memorial` variant.
- **Footer credit:** keep "Built by Nxtedge Studio", linking to `https://nxtedgestudio.com/?utm_source=adewoyefoundation.org&utm_medium=referral&utm_campaign=built_by&utm_content=footer_credit`, plus the `<!-- Built by Nxtedge Studio -->` comment and `author` meta tag on every page.
