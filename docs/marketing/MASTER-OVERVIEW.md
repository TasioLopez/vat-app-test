# ValentineZ Assist Tool (VAT) — Master overview

**Audience:** Internal first. Source of truth for later assets (one-pager, use case, presentation).  
**Status:** Assumptions refreshed 2026-11-24 (Europe/Amsterdam).  
**Product name:** ValentineZ Assist Tool (VAT App)

---

## 1. Thesis

VAT is a **connected operating system for 2e-spoor / re-integration work**: dossiers, documents, AI drafting, exports, office reservations — and, on the roadmap, CRM / internal administration — in one place. That replaces fragmented tools, duplicate subscriptions, and disconnected information, while advisors finish Trajectplannen and CVs far faster and can take on more revenue-generating work.

---

## 2. Locked facts (confirmed)

| Metric | Value | Notes |
|--------|------:|-------|
| Snapshot date | 24 Nov 2026 | |
| Rollout start | **Start of September 2026** | Gradual add of users; not everyone uses it fully yet |
| Observation window | **≈ 12 weeks / 2.76 months** (1 Sep → 24 Nov 2026) | |
| Users | ~30 | Varying intensity: full / partial / not yet |
| Werkgevers on platform | **218** | Essentially all employers |
| Trajectplannen generated | **325** | Cumulative in window |
| CVs generated | **164** | Cumulative in window |
| Core delivery team (capacity story) | **~4 advisors** | Same headcount → more throughput / revenue capacity |
| Fully loaded labor rate | **€50 / hour** | Locked for this model |
| TP time — before | **≈ 3.0 hours** | Manual / fragmented |
| TP time — with VAT | **≤ 0.5 hours** (30 min or less) | Model uses **0.5 h** (conservative end of “or less”) |
| CV time — before | **≥ 2.0 hours** | Model uses **2.0 h** |
| CV time — with VAT | **≤ 10 minutes** | Model uses **10 min (0.167 h)** |
| Revenue upside | **Allowed** in materials | See §8 |
| Incumbent CRM | In use today | Modeled as **anonymous “CRM suite”** using current public list pricing of the class of product ValentineZ uses (see §9). **Do not name the vendor in external assets.** |

### Implied pace in the window (not a promise)

| | Over 2.76 months | Simple annualization of period average* |
|--|-----------------:|----------------------------------------:|
| TP | 325 total → **≈ 118 / month** | ≈ **1,410 / year** |
| CV | 164 total → **≈ 59 / month** | ≈ **710 / year** |

\*Gradual rollout means early months were lighter and current exit rate is likely **higher** than the period average — while incomplete adoption means not every user yet captures full savings. Forward scenarios in §7 therefore use **adoption-aware volumes**, not blind linear annualization.

---

## 3. Problem → ecosystem

### Fragmentation without VAT

Word/Docs + drive folders + generic AI chat + separate CV tooling + email for rooms/parking + **standalone CRM** for employers/pipeline/admin + spreadsheet reporting.

### What VAT connects today

| Layer | Modules |
|-------|---------|
| Entities | Dashboard, Werkgevers, Werknemers, users/roles, Mijn Stem |
| Documents | Intake · Trajectplan 2026 (5-step) · VGR · CV (+ share/PDF) |
| Intelligence | Document analysis, autofill, section AI, gesprek → transcript → gespreksverslag |
| Archive | TP Docs, print routes |
| Operations | **Reserveren** — rooms & parking, multi-location, emails, admin |
| Support | Helpcentrum, tickets, MFA/auth |

### Roadmap layer

**CRM + internal administration inside VAT** (employer pipeline, case stages, caseload, billing-ready activity, management reporting) so the standalone CRM suite is no longer required for day-to-day 2e-spoor operations.

---

## 4. Time & labor savings (per document)

| Document | Before | With VAT | Hours saved | € saved @ €50/h |
|----------|-------:|---------:|------------:|----------------:|
| Trajectplan | 3.0 h | 0.5 h | **2.5 h (83%)** | **€125** |
| CV | 2.0 h | 0.167 h | **1.83 h (92%)** | **€92** |

Optional stretch (if TP often lands under 30 min): use 20 min (0.33 h) → **2.67 h / €133 per TP**. Base case keeps **30 min**.

### Adjacent (volumes not locked — for completeness)

| Document | Before | With VAT | Hours | € @ €50 |
|----------|-------:|---------:|------:|--------:|
| VGR (typical) | 3.0 h | 1.0 h | 2.0 h | €100 |
| Intake structuring | 1.5 h | 0.4 h | 1.1 h | €55 |
| Gespreksverslag | 1.5 h | 0.25 h | 1.25 h | €63 |

### Reserveren (coordination)

| Assumption | Value |
|------------|------:|
| Minutes saved / booking vs email chase | 10–15 |
| Bookings / week (placeholder) | 20–40 |
| Mid weekly hours saved | ~6.5 |
| Annual labor @ €50 × 46 weeks | **≈ €15k / year** |

---

## 5. Value already realized (1 Sep – 24 Nov 2026)

| Item | Volume | Hours saved | Labor € |
|------|-------:|------------:|--------:|
| Trajectplannen | 325 | 812.5 h | **€40,625** |
| CVs | 164 | 300.7 h | **€15,033** |
| **Document labor subtotal** | | **1,113 h** | **≈ €55,700** |

Plus soft value not in that sum: Reserveren, fewer tool switches, quality consistency.  
Caveat: if some of the 325/164 were produced with low AI use, realized € is lower until adoption catches up — headroom remains.

---

## 6. Capacity (4 advisors)

Assume **20 productive doc-hours / advisor / week** → **80 h / week** on documentation.

| Mode | h / TP | TP / week | TP / year (46 w) |
|------|-------:|----------:|-----------------:|
| Before | 3.0 | ≈ 27 | ≈ **1,230** |
| With VAT | 0.5 | ≈ 160 | ≈ **7,360** (theoretical doc ceiling) |
| **Ratio** | | | **6× on pure document time** |

**Practical reading:** documentation stops being the bottleneck; conversations, employer work, and demand set the real ceiling. Revenue upside (§8) therefore applies a **fill / utilization** factor on freed hours — not the full 6×.

Hours freed per year at Mid forward volume (700 TP × 2.5 h × 85% adoption) ≈ **1,490 h ≈ 0.75 FTE** of documentation time returned to billable / casework.

---

## 7. Forward document volumes & labor value

### Year-1 volume paths (calendar-ish next 12 months from late 2026)

Adoption still incomplete → paths are **below** naive annualization of the period average (~1,410 TP), except Stretch.

| Path | TP / year | CV / year | Adoption of full AI benefit | Doc labor € saved |
|------|----------:|----------:|----------------------------:|------------------:|
| **A Conservative** | 500 | 250 | 75% | **≈ €64k** |
| **B Mid** | 700 | 350 | 85% | **≈ €102k** |
| **C Stretch** | 1,000 | 500 | 95% | **≈ €162k** |

*(Labor € = (TP×2.5 + CV×1.833) × €50 × adoption.)*

Growth after Year 1 (volume): Conservative **15%** · Mid **25%** · Stretch **35%** YoY; adoption steps toward 95%.

---

## 8. Revenue upside (allowed)

**Working assumption — replace with finance truth:**

| Parameter | Value |
|-----------|------:|
| Incremental **contribution margin** per additional completed TP-case | **€1,200** |
| Sensitivity | €800 (low) · €2,000 (high) |

**Mechanism:** hours freed from documentation → more completed trajectories (or less backlog / overtime) without hiring.

| Path | Freed hours (approx.) | Equivalent old-world TPs (÷3 h) | Fill rate | Extra TPs | Revenue upside @ €1,200 |
|------|----------------------:|-------------------------------:|----------:|----------:|------------------------:|
| A | ~940 h | ~310 | 25% | ~78 | **≈ €94k** |
| B | ~1,490 h | ~500 | 30% | ~150 | **≈ €180k** |
| C | ~2,370 h | ~790 | 35% | ~275 | **≈ €330k** |

Sensitivity (Mid path): @ €800 → ≈ €120k · @ €2,000 → ≈ €300k.

---

## 9. All costs — status quo vs VAT

All figures **excl. VAT (BTW)** unless noted. CRM figures are **list-price class of the incumbent suite** ValentineZ uses today (public EU list, annual billing). **Do not name the vendor externally.**

### 9.1 Incumbent CRM suite — list economics (anonymous)

| Tier (feature class) | € / user / month (annual bill) | € / user / month (quarterly) | Min seats |
|----------------------|-------------------------------:|-----------------------------:|----------:|
| Essential-class | **39** | 44 | 2 |
| Advanced-class | **69** | 75 | 2 |
| Ultimate-class | **79** | 89 | 5 |

**Typical feature footprint of this suite (what VAT-CRM would need to absorb or intentionally leave behind):**

| Area | Essential-class | Advanced-class | Ultimate-class |
|------|:---------------:|:--------------:|:--------------:|
| Lead / deal pipeline, 360° relations | ✓ | ✓ | ✓ |
| Quote → invoice, e-sign, subscriptions | ✓ | ✓ | ✓ |
| Email campaigns | ✓ | ✓ | ✓ |
| AI mail sentiment / enrichment | ✓ | ✓+ | ✓+ |
| Dashboards / widgets | limited | unlimited | unlimited |
| Projects, support tickets, work orders, events | | ✓ | ✓ |
| Unlimited simple automations | | ✓ | ✓ |
| AI agents, timed automations, custom entities, multi-org | | | ✓ |
| Customer portal | add-on / Ultimate | add-on / Ultimate | ✓ / add-on |
| EU hosting, GDPR, ISO-class security claims | ✓ | ✓ | ✓ |

**Add-ons (list):** white-label portal ≈ **€125 / month** · extra sandbox **from ≈ €30 / month** · implementation often **≈ €1.5k–€4k** one-time (market commentary; confirm actual contract).

### 9.2 Incumbent CRM — annual license scenarios (ValentineZ scale)

| Seats | Essential-class | Advanced-class (**base case**) | Ultimate-class |
|------:|----------------:|-------------------------------:|---------------:|
| 20 | €9,360 | €16,560 | €18,960 |
| **30** | €14,040 | **€24,840** | €28,440 |

**Base case for this pack:** Advanced-class × **30 seats** × annual billing = **€24,840 / year**, plus ~**€1k / year** amortized implementation (e.g. €3k / 3 years), optional portal **€1,500 / year** if used.

→ **CRM cash out today (base): ≈ €26k–€28k / year** before internal admin labor on double entry / reporting.

### 9.3 Other status-quo tool costs (estimate — validate on invoices)

| Cost | Low / year | High / year | Notes |
|------|----------:|------------:|-------|
| Generic AI seats (ChatGPT-class team tools) | €6k | €12k | If still paid in parallel (~€20–35/user/mo × subset of 30) |
| Ad-hoc CV / PDF / storage sprawl | €1k | €4k | Soft licenses + shadow IT |
| Booking / room tools (if any paid) | €0 | €3k | Else “free” but high coordination labor (§4) |
| **Subtotal other SaaS** | **€7k** | **€19k** | |

### 9.4 Status-quo labor still paid (documentation)

At Mid forward volumes **without** VAT: 700×3.0 + 350×2.0 = **2,800 h** → **€140k / year** labor on TP+CV alone.  
With VAT (85% adoption): effective remaining labor ≈ **€38k** → **€102k labor avoided** (§7).

### 9.5 VAT platform operating costs (must show — confirm actuals)

Not taken from production bills yet. Use as **working OpEx band** until finance fills real numbers:

| VAT cost | Low / year | Mid / year | High / year | What it covers |
|----------|----------:|-----------:|------------:|----------------|
| Hosting (app, DB, storage, PDF workers) | €4k | €8k | €15k | Scales with users/files |
| AI / LLM API | €8k | €18k | €35k | Scales with TP/CV/VGR/gesprek volume |
| Email / misc services | €0.5k | €1k | €2k | Booking mail, invites |
| Internal maintain / support allocation | €5k | €12k | €25k | Eng + admin time on the product |
| **VAT OpEx (docs-era)** | **€17.5k** | **€39k** | **€77k** | |
| Extra OpEx when CRM module live | +€3k | **+€8k** | +€15k | Extra build amortization / infra for CRM features |

**Mid docs-era VAT OpEx used below: €39k / year.**  
**Mid VAT+CRM OpEx: €47k / year.**

> Action: replace Mid with real Vercel/Supabase/OpenAI/invoices before board-level use.

---

## 10. Net view — Year 1 (docs only, CRM still external)

**Mid path** example:

| Line | € / year |
|------|--------:|
| (+) Doc labor saved | 102,000 |
| (+) Reserveren labor | 15,000 |
| (+) Other SaaS avoided / reduced (mid of band) | 10,000 |
| (+) Revenue upside (fill on freed hours) | 180,000 |
| (−) VAT platform OpEx (mid) | −39,000 |
| (−) Incumbent CRM still paid | −24,840 |
| (−) CRM impl amort / portal (if any) | −2,500 |
| **Net Year-1 Mid (illustrative)** | **≈ €241k** |

Conservative without revenue upside: labor + booking + partial SaaS − VAT OpEx − CRM ≈ **€102k + €15k + €7k − €39k − €27k ≈ €58k**.

---

## 11. CRM integration — start **January 2027** vs **June 2027**

### 11.1 What changes when CRM is inside VAT

| Avoided / reduced | Mid € / year |
|-------------------|-------------:|
| Incumbent CRM licenses (30 × Advanced-class) | **24,840** |
| Impl amort + typical add-ons (if dropped) | **2,500** |
| Admin labor: double entry, status chase, pack reporting | **45,000** |
| **CRM-era gross benefit (before extra VAT OpEx)** | **≈ €72k** |
| (−) Extra VAT OpEx for CRM module | −8,000 |
| **Net CRM-era add-on** | **≈ €64k / year** |

Admin labor detail @ €50/h (mid): double entry ~€17k + weekly reporting/caseload ~€18k + rework/missed handoffs ~€10k ≈ **€45k**.

### 11.2 Timeline (from snapshot 24 Nov 2026)

| | **CRM go-live Jan 2027** | **CRM go-live June 2027** |
|--|--------------------------|---------------------------|
| Remaining 2026 (≈5 weeks) | Docs-only | Docs-only |
| 2027 CRM benefit months | **12** | **7** (Jun–Dec) |
| 2028–2031 | Full CRM each year | Full CRM each year |
| 2027 CRM net add-on | **≈ €64k** | **≈ €37k** (7/12 × 64) |
| Delay cost of waiting to June | | **≈ €27k** forgone in 2027 alone |

### 11.3 Five-year forward (2027–2031) — Mid docs path + CRM options

Docs labor grows 25% YoY from Year-1 Mid €102k; booking €15k flat; other SaaS avoided €10k flat while CRM external, then €3k residual after CRM (some niche tools remain); revenue upside grows with freed hours (~25% YoY from €180k); VAT OpEx €39k → €47k when CRM live.

**Cumulative 2027–2031 (rounded):**

| | Docs + revenue, CRM stays external | **+ CRM from Jan 2027** | **+ CRM from June 2027** |
|--|-----------------------------------:|------------------------:|-------------------------:|
| 5-year gross benefit (labor+booking+SaaS+revenue+CRM nets) | ≈ €1.9M | ≈ **€2.2M** | ≈ **€2.15M** |
| 5-year VAT OpEx (sum) | ≈ €0.20M | ≈ **€0.23M** | ≈ **€0.23M** |
| **5-year net (illustrative)** | ≈ **€1.7M** | ≈ **€2.0M** | ≈ **€1.92M** |

**Jan vs June:** choosing January rather than June is worth on the order of **≈ €70–90k** over five years (forgone 2027 months + slightly earlier compounding on admin efficiency) — exact delta ≈ **€80k** in this Mid workbook.

### 11.4 Year-by-year sketch (Mid + CRM Jan 2027)

| Year | Doc labor | Revenue upside | Booking+SaaS | CRM net add-on | VAT OpEx | **Net** |
|------|----------:|---------------:|-------------:|---------------:|---------:|--------:|
| 2027 | 102k | 180k | 25k | 64k | −47k | **≈ €324k** |
| 2028 | 128k | 225k | 18k | 64k | −47k | **≈ €388k** |
| 2029 | 160k | 281k | 18k | 64k | −50k | **≈ €473k** |
| 2030 | 200k | 351k | 18k | 64k | −52k | **≈ €581k** |
| 2031 | 250k | 439k | 18k | 64k | −55k | **≈ €716k** |
| **Sum** | | | | | | **≈ €2.5M** gross lines; net **≈ €2.0M** after OpEx already in rows |

*(Table nets already subtract OpEx. Revenue and volumes are the sensitive levers — finance should stress-test margin and fill rate.)*

### 11.5 Same sketch with CRM June 2027

2027 net ≈ €324k − €27k ≈ **€297k**; 2028–2031 unchanged → five-year net ≈ **€1.92M**.

---

## 12. Cost stack one-pager (everything in one place)

### Money out (annual, Mid, 30 users)

| Cost | Status quo (no VAT) | VAT docs only | VAT + CRM |
|------|--------------------:|--------------:|----------:|
| Advisor TP+CV labor | €140k | €38k | €38k |
| Admin / CRM double-entry labor | €45k | €45k | €0–5k |
| Incumbent CRM suite | €25–28k | €25–28k | **€0** |
| Generic AI + minor SaaS | €7–19k | €3–8k | €2–5k |
| VAT platform OpEx | €0 | €39k | €47k |
| **Total money out (mid-ish)** | **≈ €220–230k** | **≈ €150–160k** | **≈ €90–100k** |

### Money in / value (annual, Mid)

| | VAT docs only | VAT + CRM |
|--|--------------:|----------:|
| Labor & tool value vs status quo | ≈ €110–130k | ≈ €170–200k |
| Revenue upside (fill) | ≈ €180k | ≈ €180k+ |
| **Combined vs status quo** | **≈ €0.3M** | **≈ €0.35M+** |

---

## 13. Qualitative benefits

One dossier truth · consistent TP/VGR/CV · role-based access · faster onboarding · Reserveren beside caseload · measurable output already (325 / 164) · adoption headroom · CRM-on-VAT removes the last major silo.

---

## 14. Risks & honesty

- Adoption uneven → € savings ramp with training  
- TP “≤30 min” / CV “≤10 min” are operating claims; model uses those ceilings  
- Period average ≠ steady-state run rate (gradual ramp)  
- VAT OpEx Mid (€39k) is a **placeholder** until invoices  
- Contribution margin €1,200 and fill rates drive revenue upside — finance must confirm  
- CRM feature parity: VAT may not need Ultimate-class AI agents / multi-org on day one; scope the module to **2e-spoor operations** (relations, cases, stages, reporting, billing hooks), not a full marketing suite clone  
- Never name the incumbent CRM vendor in public assets  

---

## 15. Asset keep / discard (updated)

| Asset | Keep | Soften / drop |
|-------|------|----------------|
| Internal one-pager | 325/164/218/30 · Sep–Nov window · 3h→30m · 2h→10m · €50/h · €55.7k to date · Year-1 Mid net · Jan vs June CRM · anonymous CRM €25k/yr | Full year-by-year table (appendix) |
| Public | Time % · connected ecosystem · rounded volumes · no vendor name · careful on € | Exact CRM list prices, OpEx guts, margin €1,200 |
| Deck | Problem → ecosystem → proof → cost stack → ROI → CRM timing → ask | Assumption dump (backup slides) |
| Use case | Advisor day-in-the-life + Reserveren + future CRM | Scenario grid |

---

## 16. Open items still useful

1. Real VAT OpEx (hosting + LLM + support) from invoices  
2. Real incumbent CRM contract (tier, seats, add-ons, impl) vs list  
3. Finance sign-off on **€1,200** contribution margin and fill rates  
4. Whether public materials may show revenue upside  
5. Preferred CRM go-live narrative: **January 2027** (max value) vs **June 2027** (more build time)

---

## 17. Headline sheet

| Headline | Figure |
|----------|-------|
| Window | Sep 2026 → 24 Nov 2026 (~12 weeks), gradual |
| Output | 325 TP · 164 CV · 218 werkgevers · ~30 users |
| TP | 3.0 h → 0.5 h · **€125** saved |
| CV | 2.0 h → 10 min · **€92** saved |
| Labor rate | **€50/h** |
| Value to date (TP+CV labor) | **≈ €55.7k** |
| Year-1 Mid doc labor saved | **≈ €102k** |
| Year-1 Mid revenue upside | **≈ €180k** |
| Incumbent CRM (30× Advanced-class list) | **≈ €24.8k/yr** |
| VAT OpEx Mid (placeholder) | **≈ €39k** docs / **€47k** +CRM |
| CRM net add-on | **≈ €64k/yr** |
| CRM Jan 2027 vs June 2027 | June forgoes **≈ €27k** in 2027; **≈ €80k** over 5 years |
| 5-year net Mid + CRM Jan | **≈ €2.0M** illustrative |

---

*Next: keep/discard pass → freeze OpEx/margin → cut internal one-pager + deck.*
