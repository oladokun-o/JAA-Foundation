# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-page site for the Joseph Alabi Adewoye (JAA) Foundation, a community NGO serving Ijara-Isin and surrounding communities in Kwara State. It was built by Nxtedge Studio. Production is https://adewoyefoundation.org/, hosted on **Netlify** (`netlify.toml` publishes the repo root, so there's no build step).

## Development

There is no package manager, build, linter or test suite. The site is plain HTML/CSS/JS plus one Netlify Function.

- Static preview: `python3 -m http.server 8000`. The contact form posts to `/api/contact`, which won't exist under this server.
- Full preview including the function: `netlify dev` (Netlify CLI).
- Syntax check: `node --check main.js && node --check netlify/functions/contact.mjs`

## Architecture

- `index.html`: the whole page. The utility bar (`.topbar`) scrolls away; `.site-header` is sticky. Sections are anchored `#home`, `#about`, `#purpose`, `#legacy`, `#trustees`, `#contact`, and both the nav and footer link to them.
- `styles.css`: design tokens live on `:root` (forest/cream/gold palette, Cormorant Garamond for display and Inter for body). Mobile-first, with the main breakpoint at 900px. Remix Icon (`ri-*`) is the only icon set.
- `main.js`: a single IIFE with no dependencies. It handles the mobile menu, the scroll-spy that highlights the current nav link, scroll reveals (any element with `data-reveal` / `data-reveal-delay`), the biography expand toggle, the `<dialog>` lightbox (`data-lightbox="<src>"`) and the contact-form submit.
  - Reveal styles only apply when `html.js` is set, which an inline script in `<head>` does, so content stays visible without JS.
- `netlify/functions/contact.mjs`: `POST /api/contact`. It sends the message to the foundation through Resend's REST API (plain `fetch`, no SDK), then sends a best-effort confirmation to the visitor. The confirmation deliberately does not echo the message back. Spam is blocked with a honeypot field named `company`.
  - Environment variables: `RESEND_API_KEY` (required), `CONTACT_TO_EMAIL` (default `adewoyefoundation@gmail.com`), `CONTACT_FROM_EMAIL` (default `noreply@updates.nxtedgestudio.com`, Nxtedge's verified Resend domain).

## Conventions

- **WhatsApp:** set `WHATSAPP_NUMBER` at the top of `main.js` (digits only, international format). Until it's set, every `[data-whatsapp]` element stays `hidden`: the top-bar link, the contact-list entry and the floating button.
- **Trustees:** the cards are the founder's children in birth order. #2, Olubunmi Akanbi Adewoye, is deceased and uses the `trustee--memorial` variant.
- **Footer credit:** keep "Built by Nxtedge Studio", with the link `https://nxtedgestudio.com/?utm_source=adewoyefoundation.org&utm_medium=referral&utm_campaign=built_by&utm_content=footer_credit`, plus the `<!-- Built by Nxtedge Studio -->` comment and the `author` meta tag in `<head>`.
