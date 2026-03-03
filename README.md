# CareerAI 🎯

**South Africa's free AI-powered job application agent.**

CareerAI reads your CV, matches you to real South African jobs, writes a tailored motivational letter and ATS-optimised resume — then exports both as professional PDFs ready to attach and send.

---

## What it does

Upload a CV → get matched to 6 SA jobs → generate a complete application package in under 2 minutes.

Each package includes:
- **Motivational Letter PDF** — personalised to the company, role, and recruiter by name
- **ATS Resume PDF** — 100% tailored with exact job keywords, gold-branded layout
- **Email Draft** — punchy recruiter outreach under 150 words
- **Job Fit Analysis** — strengths, gaps, salary tip, interview focus, EE/B-BBEE note
- **Improved CV** — grammar-fixed, quantified, and keyword-optimised version of your original

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML + CSS + JavaScript |
| AI / LLM | Groq API — Llama 3.3 70B Versatile |
| CV parsing | PDF.js 3.11 (text-based PDFs), Mammoth.js 1.6 (DOCX) |
| PDF export | jsPDF 2.5 (in-browser generation) |
| Fonts | Syne, DM Sans, DM Mono (Google Fonts) |
| Hosting | Any static host — no backend required |

---

## Files

```
careerai/
├── index.html      # App structure — no inline CSS or JS
├── styles.css      # All styles: design tokens, layout, components, responsive
└── app.js          # All logic: upload, AI calls, job rendering, PDF generation, send flow
```

### index.html
Pure semantic HTML. Links to `styles.css` and `app.js`. No embedded styles or scripts.

### styles.css
- CSS custom properties (design tokens) for the full dark-luxury palette
- Nav, hero, wizard, cards, upload zone, job cards, output tabs, send panel
- PDF badge components, progress bar, log output
- Responsive breakpoints at 768px and 480px
- Keyframe animations: parallax, orb drift, fade-up, scroll reveal, pulse

### app.js
- **State** — single `S` object tracks CV text, jobs, selected job, generated docs, active tab
- **Scroll** — nav raise, hero parallax, scroll-reveal for `.reveal` elements
- **CV upload** — handles PDF (PDF.js), DOCX (Mammoth), and TXT; extracts and previews text
- **Groq API** — `async groq(sys, usr, tok)` wrapper; `parseObj` / `parseArr` for JSON responses
- **analyseCV()** — extracts 12-field profile from CV text; auto-fills form
- **findJobs()** — generates 6 realistic SA jobs matched to candidate profile
- **generateDocs()** — sequentially calls Groq for cover letter, ATS resume, email, analysis, improved CV
- **buildCoverLetterPDF()** — dark header, gold rule, contact block, body text, per-page footer
- **buildResumePDF()** — dark header with gold left bar, "TAILORED FOR" chip, gold section headers, bullet styling, role/date bold detection
- **sendApplication()** — opens mailto, downloads both PDFs with staggered timing (400ms / 1000ms)

---

## Running locally

No build step, no server, no dependencies to install.

```bash
git clone https://github.com/yourname/careerai
cd careerai

# Any static server works:
npx serve .
# or
python -m http.server 8080
```

Open `http://localhost:8080` and upload a CV.

> ⚠️ The Groq API key in `app.js` is embedded for demo purposes. For production, proxy requests through a backend or use environment variables with a serverless function.

---

## How it works — step by step

```
1. Upload CV (PDF / DOCX / TXT)
       ↓
2. PDF.js or Mammoth extracts raw text
       ↓
3. Groq LLM extracts 12-field candidate profile (JSON)
       ↓
4. User reviews + edits profile form
       ↓
5. Groq generates 6 SA job matches (JSON array)
       ↓
6. User clicks "Generate & Apply" on a job card
       ↓
7. Groq sequentially generates 5 documents
   (cover letter → ATS resume → email → analysis → improved CV)
       ↓
8. User fills send panel (To / From / Subject auto-filled)
       ↓
9. Click "Open Email + Download PDFs"
   → mailto: opens in email client
   → Cover Letter PDF downloads (400ms delay)
   → ATS Resume PDF downloads (1000ms delay)
       ↓
10. User attaches both PDFs → Send
```

---

## AI prompting strategy

Each Groq call is tuned for a specific output type:

| Call | System prompt focus | Max tokens |
|---|---|---|
| Profile extraction | Structured JSON only, no markdown | 900 |
| Job matching | JSON array, real SA companies, .co.za emails | 1500 |
| Cover letter | SA career coach, no clichés, 3 paragraphs | 1000 |
| ATS resume | Mirror job keywords exactly, SA CV format, 8 sections | 2000 |
| Email draft | Under 150 words, punchy, subject line included | 500 |
| Job fit analysis | Honest, SA-specific, salary + EE/B-BBEE notes | 700 |
| Improved CV | Fix grammar, quantify, strengthen bullets | 1500 |

---

## PDF design

### Cover Letter
- A4 portrait, 22mm margins
- Dark header (`#0d0d0f`) with gold rule
- Candidate name 18pt bold, title + contact in muted gold
- Date and recruiter right-aligned
- "RE: Application" subject with gold underline
- 10.5pt Helvetica body, 5.8mm line height
- Multi-page aware with branded footer

### ATS Resume
- A4 portrait, 20mm margins
- Dark header with 5mm gold left bar
- Name 22pt bold, title in gold, contact row
- "TAILORED FOR: [ROLE]" gold chip (top right)
- Section headers: gold fill bar, 9pt bold dark text
- Bullets: gold circle dots, 9.5pt indented
- Bold detection for ALL-CAPS lines and date ranges
- Per-page dark footer bar with role + company branding

---

## Limitations

- **Scanned PDFs** — image-only PDFs cannot be parsed; user must save as `.txt`
- **API key exposure** — the Groq key is client-side for this demo build
- **No persistence** — state lives in memory; refreshing resets everything
- **Email attachment** — `mailto:` links cannot auto-attach files; user must attach PDFs manually
- **Groq rate limits** — free tier has request limits; heavy use may hit them

---

## Roadmap

- [ ] Backend proxy to secure API key
- [ ] LinkedIn job scraping integration
- [ ] Real-time job board feed (PNet, Careers24 API)
- [ ] User accounts + application history
- [ ] WhatsApp delivery of PDFs
- [ ] Cover letter in Afrikaans / Zulu
- [ ] Interview prep mode (predicted questions per job)

---

## Credits

Built by **Francis Mujakachi**
Email: [info@careerai.co.za](mailto:info@careerai.co.za)

Powered by [Groq](https://groq.com) · [Llama 3.3](https://ai.meta.com/blog/llama-3/) · [jsPDF](https://github.com/parallax/jsPDF) · [PDF.js](https://mozilla.github.io/pdf.js/) · [Mammoth.js](https://github.com/mwilliamson/mammoth.js)

---

© 2025 Francis Mujakachi · CareerAI South Africa · All rights reserved
