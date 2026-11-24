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
| Revenue upside | **Allowed** | **€1,000 contribution margin per extra full case** (person handled: TP + VGR + related docs) — see §8 |
| Recommended seat price | **€49 / user / month** + AI at cost | See §9.6 |
| CRM evaluation context | Left **PerfectView**; considering **Tribe CRM** (~**30 users**) | Internal comparison in §9. Public/external assets: prefer “off-the-shelf CRM” unless naming is intentional. |

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

**Locked commercial assumption:** each **extra full case** you can handle (one person through TP + VGR + the related document set) contributes **€1,000** more (contribution margin).

| Parameter | Value |
|-----------|------:|
| Margin per extra full case | **€1,000** |
| What “case” means | Whole person handled — not TP alone: Intake / TP / VGR / CV and the dossier work around them |
| Mechanism | Faster documents free advisor time → more people through the pipeline without hiring |

| Path | Doc hours freed (approx.) | Fill into extra full cases | Extra cases | Revenue upside @ €1,000 |
|------|--------------------------:|---------------------------:|------------:|------------------------:|
| A Conservative | ~1,100 h | ~25% of capacity liberated | ~90 | **≈ €90k** |
| **B Mid** | ~2,000 h | ~30% | **~150** | **≈ €150k** |
| C Stretch | ~2,900 h | ~35% | ~250 | **≈ €250k** |

*(Fill &lt; 100% because conversations, employer contact, and demand still gate throughput — documentation is no longer the bottleneck.)*

---

## 9. All costs — Tribe path vs VAT path

All figures **excl. BTW**. List prices from public Tribe pages (annual billing). Discounts unknown — treat as **ceiling**; a discount does not close the **capability** gap below.

### 9.0 Context

- Client moved away from **PerfectView** (cheaper NL CRM: roughly €15–30/user/mo depending on seat count — general sales/service CRM).  
- Now considering **Tribe CRM** at ~**30 users**.  
- PerfectView / Tribe are **generic CRMs**. VAT is a **2e-spoor operating system** (documents + AI + dossier + Reserveren). They solve different jobs; stacking Tribe *plus* Word/ChatGPT/booking is the fragmented alternative to VAT @ **€49 + AI**.

### 9.1 Tribe list pricing (30 users)

| Tier | € / user / mo (annual) | € / user / mo (quarterly) | **30 users / year** | Min seats |
|------|-----------------------:|--------------------------:|--------------------:|----------:|
| Essential | 39 | 44 | **€14,040** | 2 |
| **Advanced (realistic fit)** | **69** | 75 | **€24,840** | 2 |
| Ultimate | 79 | 89 | **€28,440** | 5 |

**Add-ons / extras (list):** white-label portal **€125/mo** (€1,500/yr) · sandbox **from ~€30/mo** · implementation commonly cited **≈ €1.5k–€4k** one-time.

**Year-1 Tribe cash (illustrative, no discount):**

| Package | Year-1 € |
|---------|---------:|
| Essential only | ≈ €14k + impl |
| **Advanced only** | **≈ €25k** + impl €1.5–4k → **≈ €27–29k** |
| Advanced + portal | ≈ €26k + impl |
| Ultimate + portal | ≈ €30k + impl |

**Which Tribe tier fits a 30-person 2e-spoor org?**

| Need | Essential | Advanced | Ultimate |
|------|:---------:|:--------:|:--------:|
| Relations, pipeline, quotes/invoices, email campaigns | ✓ | ✓ | ✓ |
| Projects / milestones, ticketing, work orders, richer automations | | **✓** | ✓ |
| Custom activity types, conditional roles | | **✓** | ✓ |
| AI agents, timed automations, custom data model, multi-org | | | ✓ |

→ For case-like delivery (trajectories as work, tickets, projects), **Advanced is the tier that actually fits**. Essential is “CRM lite.” Ultimate adds generic AI agents — still **not** Trajectplan/VGR/CV intelligence.

### 9.2 Capability check — does Tribe do what VAT does?

**Short answer: no.** Tribe can store relations and merge **generic document templates** (offers, invoices, simple docs). It does **not** ship a 2e-spoor document factory.

| Capability | VAT today | Tribe (even Ultimate) |
|------------|:---------:|:---------------------:|
| Werkgever / werknemer dossier hub | ✓ | Relations/projects (generic) |
| Intake builder + dossier AI extraction | ✓ | ✗ (attach files / notes) |
| Trajectplan 2026 wizard (5 steps, PoW, zoekprofiel, belastbaarheid, visies, …) | ✓ | ✗ (maybe a blank Word-like template you maintain yourself) |
| AI autofill TP/CV from intake, FML/IZP, AD, notes | ✓ | ✗ (mail sentiment / lead AI ≠ dossier AI) |
| VGR first + follow-up, hydrate from TP, period history | ✓ | ✗ |
| CV builder, layouts, photo, share link, PDF | ✓ | ✗ |
| Gesprek audio/text → structured gespreksverslag | ✓ | ✗ |
| TP Docs archive + print routes | ✓ | File attachments only |
| Reserveren (rooms + parking, multi-location) | ✓ | Calendar/activities ≠ room/parking inventory |
| In-app help for 2e-spoor workflows | ✓ | Generic CRM help |
| Lead → quote → invoice, email campaigns, ERP links | Roadmap / partial | **✓ (Tribe’s core)** |
| Generic AI agents (meeting prep, lead gen) | ✗ | Ultimate |

**Conclusion:** Tribe (any tier) does **not** replace VAT. Choosing Tribe means **Tribe + still needing** VAT *or* Word + generic AI + manual TP/VGR/CV + booking chaos. The fair commercial comparison is:

**Fragmented stack** = Tribe Advanced (~€25k/yr) + generic AI seats + manual/document labor  
**vs VAT** = **€49 × 30 + AI usage (~€6k)** with TP/VGR/CV/intake/Reserveren included.

### 9.3 Money comparison (30 users, list, excl. BTW)

| Annual cost | Tribe Advanced path | VAT path @ €49 |
|-------------|--------------------:|---------------:|
| CRM / platform seats | **€24,840** | **€17,640** |
| Implementation (Year 1) | €1.5–4k | already live |
| Portal / sandbox add-ons (if taken) | €0–2k | — |
| AI for documents | Extra (ChatGPT-class or none → more labor) **€6–12k** or €0 + huge labor | **≈ €6,000** pass-through (usage) |
| **Software cash (steady year, mid)** | **≈ €31–37k** + still no TP/VGR AI | **≈ €23.6k** **and** document OS included |
| Advisor doc labor (Mid volumes) | Still ~**€140k** if manual / weak templates | ~**€38k** remaining review time |

So even before labor: VAT seats+AI are in the same ballpark as **Tribe alone**, while delivering the workload Tribe cannot. With labor, the fragmented path is an order of magnitude more expensive.

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

### 9.5 VAT platform operating costs (**actuals from provider**)

| Cost | Amount | How billed |
|------|--------|------------|
| Domain | **≈ €10 / year** | Fixed |
| Hosting (app/DB/etc.) | **€50–100 / month** (≈ €600–1,200 / year) | Fixed-ish; use **€100/mo** as ceiling |
| AI / LLM usage | **≈ €500 / month** today (≈ €6,000 / year) | **Variable** — billed to the client at usage, **not** included in the seat subscription |

**Provider fixed OpEx (platform only): ≈ €610–1,210 / year** (domain + hosting).  
**AI:** pass-through to client (~€6k/yr at current run-rate; rises with volume).

> Earlier €39k OpEx placeholder is **retired**. Net math below uses real fixed OpEx + AI pass-through.

---

## 9.6 Recommended commercial model (provider ↔ client)

**Structure**

1. **Seat subscription** — fixed € / user / month (platform access: dossiers, TP, CV, VGR, intake, Reserveren, help).  
2. **AI usage** — billed separately at cost (variable; ~€500/mo org-wide today).  
3. Optional: annual prepay (−10%), or a small AI admin fee (e.g. +10% on AI) if you want buffer.

**Why this split:** AI cost scales with how hard they use the product; you are not trapped under-pricing heavy months, and the client only pays for what they consume.

### Value vs price (client lens, ~30 users)

Even a **light** user (2 TP + 1 CV / month) saves ≈ **€342 / month** in labor @ €50/h.  
A **mid** user (4 TP + 2 CV / month) saves ≈ **€684 / month**.  
Org Mid path labor + Reserveren ≈ **€117k / year** before revenue upside.

Incumbent CRM Advanced-class alone is already **€69 / user / month** list — for CRM only, not the document OS.

### Price ladder (AI billed extra)

| Seat price | Client pays seats (30) | + AI ~€500 | Client total / mo | Your rev / mo | Your fixed cost | Your platform margin / mo |
|-----------:|-----------------------:|-----------:|------------------:|--------------:|----------------:|--------------------------:|
| €29 | €870 | €1,370 | €1,370 | €870 | ≤ €101 | **≈ €770** |
| €39 | €1,170 | €1,670 | €1,670 | €1,170 | ≤ €101 | **≈ €1,070** |
| **€49 (recommended)** | **€1,470** | **€1,970** | **€1,970** | **€1,470** | **≤ €101** | **≈ €1,370** |
| €59 | €1,770 | €2,270 | €2,270 | €1,770 | ≤ €101 | **≈ €1,670** |
| €69 | €2,070 | €2,570 | €2,570 | €2,070 | ≤ €101 | **≈ €1,970** |

Annual at **€49 / user / month** × 30: seats **€17.6k** + AI **€6k** ≈ **€23.6k** client cost vs **≈ €117k** Mid labor/booking value → client still keeps on the order of **≈ €90k+ / year** net (before revenue upside). ROI roughly **4–5×** on fees alone.

### Recommendation

| Role | Price |
|------|------:|
| **Sweet spot** | **€49 / user / month** + AI at cost |
| Intro / land | €39 / user / month (first 3–6 months or &lt;20 seats) |
| Premium / SLA / roadmap priority | €59 / user / month |
| Avoid going above | **€69** for docs-only (equals CRM list seat with less “CRM story”); once **CRM is inside VAT**, **€69–79** becomes easier to defend as it *replaces* the €69 CRM seat |

**For you:** at €49 × 30, ≈ **€17.6k / year** seat revenue against ≈ **€1.2k** fixed hosting/domain → **~90%+ gross margin** on the subscription (your time to build/support is the real “cost” that margin should fund).  
**For them:** still far below labor savings and below or near a single CRM seat while getting the whole document ecosystem.

If fewer than 30 are billed (e.g. 20 active seats @ €49): you still clear ≈ **€980 / month** platform margin — healthy vs ≤ €100 hosting.

---

## 10. Net view — Year 1 (docs only, CRM still external)

**Client Mid path** (value created minus what they pay you):

| Line | € / year |
|------|--------:|
| (+) Doc labor saved | 102,000 |
| (+) Reserveren labor | 15,000 |
| (+) Other SaaS avoided / reduced (mid) | 10,000 |
| (+) Revenue upside (~150 extra full cases × €1,000) | 150,000 |
| (−) VAT seats @ €49 × 30 | −17,640 |
| (−) AI usage pass-through | −6,000 |
| (−) Tribe Advanced still paid (if they buy both) | −24,840 |
| (−) Tribe impl/add-ons if any | −2,500 |
| **Net Year-1 Mid for client (illustrative)** | **≈ €226k** |

Without revenue upside: ≈ **€102k + €15k + €10k − €18k − €6k − €27k ≈ €76k** client net.  
**If they choose VAT and skip Tribe** for day-to-day 2e-spoor ops (CRM features later in VAT): drop the −€27k Tribe lines → client net Mid **≈ €253k** (with revenue upside).

**Provider Year-1 (your side):** seat revenue ≈ **€17.6k** − hosting/domain ≈ **€1.2k** → **≈ €16.4k** platform contribution (AI zero-margin pass-through unless you add a small markup).

---

## 11. CRM integration — start **January 2027** vs **June 2027**

### 11.1 What changes when CRM is inside VAT

| Avoided / reduced | Mid € / year |
|-------------------|-------------:|
| Tribe Advanced licenses (30 × €69) | **24,840** |
| Impl amort + typical add-ons (if dropped) | **2,500** |
| Admin labor: double entry, status chase, pack reporting | **45,000** |
| **CRM-era gross benefit (client)** | **≈ €72k / year** |
| Seat step-up when CRM ships in VAT | e.g. €49 → **€69** (matches Tribe Advanced list seat; client consolidates into one product) |

Admin labor detail @ €50/h (mid): double entry ~€17k + weekly reporting/caseload ~€18k + rework/missed handoffs ~€10k ≈ **€45k**.

### 11.2 Timeline (from snapshot 24 Nov 2026)

| | **CRM go-live Jan 2027** | **CRM go-live June 2027** |
|--|--------------------------|---------------------------|
| Remaining 2026 (≈5 weeks) | Docs-only | Docs-only |
| 2027 CRM benefit months | **12** | **7** (Jun–Dec) |
| 2028–2031 | Full CRM each year | Full CRM each year |
| 2027 CRM benefit (license + admin) | **≈ €72k** | **≈ €42k** (7/12 × 72) |
| Delay cost of waiting to June | | **≈ €30k** forgone in 2027 alone |

### 11.3 Five-year forward (2027–2031) — Mid path, **client** net

Docs labor +25% YoY from €102k; booking €15k; SaaS avoided €10k → €3k after CRM; revenue upside +25% YoY from **€150k** (€1,000/case); client pays seats (€49 → €69 when CRM live) + AI (~€6k growing ~20%/yr); Tribe license drops when CRM is inside VAT.

**Cumulative 2027–2031 client net (rounded):**

| | Docs only (CRM stays external) | **+ CRM from Jan 2027** | **+ CRM from June 2027** |
|--|--------------------------------:|------------------------:|-------------------------:|
| **5-year client net** | ≈ **€1.9M** | ≈ **€2.2M** | ≈ **€2.1M** |

**Jan vs June:** January over June ≈ **€80–100k** more client value over five years (earlier license + admin savings).

### 11.4 Year-by-year sketch (client Mid + CRM Jan 2027, seats step to €69)

| Year | Doc labor | Revenue upside | Booking+SaaS | Tribe+admin saved | (−) Seats+AI | **Client net** |
|------|----------:|---------------:|-------------:|------------------:|-------------:|---------------:|
| 2027 | 102k | 150k | 25k | 72k | −31k | **≈ €318k** |
| 2028 | 128k | 188k | 18k | 72k | −33k | **≈ €373k** |
| 2029 | 160k | 234k | 18k | 72k | −35k | **≈ €449k** |
| 2030 | 200k | 293k | 18k | 72k | −38k | **≈ €545k** |
| 2031 | 250k | 366k | 18k | 72k | −41k | **≈ €665k** |
| **Sum** | | | | | | **≈ €2.35M** |

### 11.5 Same sketch with CRM June 2027

2027 client net ≈ €318k − €30k ≈ **€288k**; 2028–2031 unchanged → five-year ≈ **≈ €2.3M**.

---

## 12. Cost stack one-pager (everything in one place)

### Money out — **client** (annual, Mid, 30 users)

| Cost | Status quo (no VAT) | VAT docs only @ €49 | VAT + CRM @ €69 |
|------|--------------------:|--------------------:|----------------:|
| Advisor TP+CV labor | €140k | €38k | €38k |
| Admin / CRM double-entry labor | €45k | €45k | €0–5k |
| Tribe Advanced (list) | €25–28k | €25–28k if dual-running | **€0** |
| Generic AI + minor SaaS | €7–19k | €0–3k (VAT AI covers docs) | €0–3k |
| VAT seats | €0 | **€17.6k** | **€24.8k** |
| VAT AI usage (pass-through) | €0 | **€6k** | **€6–8k** |
| **Total client out (mid-ish)** | **≈ €220–230k** | **≈ €135–145k** (or **≈ €110k** if no Tribe) | **≈ €75–85k** |

### Provider money (your side)

| | Docs-only @ €49 × 30 | + CRM @ €69 × 30 |
|--|---------------------:|-----------------:|
| Seat revenue | €17.6k / year | €24.8k / year |
| Fixed hosting + domain | ≈ €1.2k | ≈ €1.2–2k |
| AI | pass-through | pass-through |
| **Platform contribution** | **≈ €16.4k / year** | **≈ €23k / year** |

---

## 13. Qualitative benefits

One dossier truth · consistent TP/VGR/CV · role-based access · faster onboarding · Reserveren beside caseload · measurable output already (325 / 164) · adoption headroom · CRM-on-VAT removes the last major silo.

---

## 14. Risks & honesty

- Adoption uneven → € savings ramp with training  
- TP “≤30 min” / CV “≤10 min” are operating claims; model uses those ceilings  
- Period average ≠ steady-state run rate (gradual ramp)  
- AI ≈ €500/mo is today’s run-rate; it will rise with volume (still billed to client)  
- €1,000 / extra full case and fill rates drive revenue upside  
- Seat price €49 is the recommended balance, not a law of nature  
- VAT-CRM roadmap should cover **2e-spoor ops**, not clone Tribe’s full marketing/ERP suite on day one  
- Public assets: prefer “off-the-shelf CRM”; this internal doc may name Tribe / PerfectView  

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

1. Confirm AI “≈ €500” is **per month** (assumed)  
2. Any Tribe quote/discount vs list (doesn’t change the capability gap)  
3. Lock **€1,000 / extra full case** for external decks if used  
4. Lock seat **€49** (or €39 intro / €59 premium)  
5. CRM-in-VAT go-live: **Jan vs June 2027**

---

## 17. Headline sheet

| Headline | Figure |
|----------|-------|
| Window | Sep 2026 → 24 Nov 2026 (~12 weeks), gradual |
| Output | 325 TP · 164 CV · 218 werkgevers · ~30 users |
| TP | 3.0 h → 0.5 h · **€125** saved |
| CV | 2.0 h → 10 min · **€92** saved |
| Extra full case margin | **€1,000** / person handled |
| Mid revenue upside | **≈ €150k / year** (~150 cases) |
| **Seat price** | **€49 / user / month** + AI at cost |
| AI / hosting | **≈ €500/mo** AI · **€50–100/mo** host · **€10/yr** domain |
| Your margin @ €49×30 | **≈ €16.4k / year** |
| Tribe Advanced list @ 30 | **≈ €24.8k / year** (+ impl/add-ons) — **no TP/VGR/CV AI** |
| VAT seats+AI @ 30 | **≈ €23.6k / year** — **document OS included** |
| Fit tier if they still buy Tribe | **Advanced** (Essential too thin; Ultimate ≠ 2e-spoor docs) |
| 5-year client net Mid + CRM-in-VAT Jan | **≈ €2.35M** illustrative |

---

*Next: lock seat price → cut internal one-pager + deck.*
