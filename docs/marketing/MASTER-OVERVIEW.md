# ValentineZ Assist Tool (VAT) — Master overview

**Audience:** Internal first. Source of truth for later assets (one-pager, use case, presentation).  
**Status:** Draft for keep / discard. Numbers and assumptions marked clearly.  
**Product name:** ValentineZ Assist Tool (VAT App)  
**Date of snapshot:** 2026-11-24 (Europe/Amsterdam)

---

## 1. One-sentence thesis

VAT is a **connected operating system for 2e-spoor / re-integration work**: dossiers, documents, AI drafting, exports, and office logistics in one place — so ValentineZ avoids fragmented tools, duplicate subscriptions, and disconnected information, while advisors produce more Trajectplannen (TPs) and CVs in less time.

---

## 2. Observed facts (confirmed inputs)

These are the numbers you provided for this pack. Treat them as **current operational facts**, not yet a marketing claim set.

| Metric | Value | Notes |
|--------|------:|-------|
| Active / invited users | ~30 | Usage intensity varies: some use the app fully, some partially, some barely |
| Werkgevers (employers / clients) on the platform | 218 | Essentially all employers on the platform |
| Trajectplannen generated | 325 | Cumulative to date (period start not specified) |
| CVs generated | 164 | Cumulative to date |
| Core delivery team (capacity story) | ~4 people | Paid advisors who can produce more TPs → more revenue capacity per FTE |

**Unknown / to confirm before external use**

- Exact start date of cumulative TP/CV counts (needed to annualize cleanly)
- Current monthly run-rate (TPs, CVs, VGRs, intakes, bookings)
- Share of users who already use AI autofill end-to-end vs. partial use
- Fully loaded hourly cost per advisor (we use a working assumption below)
- Average revenue / margin per completed TP case (for revenue-upside slides)
- Which external tools / subscriptions are still paid in parallel today

---

## 3. Problem we solve

### Fragmentation today (without a single ecosystem)

Typical 2e-spoor work spreads across:

- Word / Google Docs for Trajectplan, VGR, intake notes
- Separate CV builders or templates
- Shared drives with inconsistent folder structures
- Generic AI chat (ChatGPT etc.) with **no dossier context**, copy-paste risk, and no audit trail
- Email / Outlook / Teams for room & parking bookings
- Spreadsheets or a separate CRM for employer/employee status
- Manual PDF assembly and version chaos

**Result:** double entry, lost context, slow documents, uneven quality, multiple subscriptions, and no single source of truth.

### What VAT changes

One signed-in workspace where **werkgever → werknemer → documents → AI → PDF → archive → (office) reservation** are linked. Data entered once feeds the next document. AI reads the dossier, not a pasted chat dump.

---

## 4. Product ecosystem (what exists in the app today)

Think in layers: **entities → document builders → AI services → operations → support**.

### 4.1 Core entities

| Module | Route / area | Role |
|--------|--------------|------|
| Dashboard | `/dashboard` | Counts, scope (mine vs org), recent dossiers |
| Werkgevers | `/dashboard/clients` | Employer / opdrachtgever records |
| Werknemers | `/dashboard/employees` | Dossier hub; status of Intake / TP / VGR / CV |
| Users & roles | `/dashboard/users` | Admin vs standard; employee–advisor linking |
| Settings | `/dashboard/settings` | Incl. Mijn Stem (advisor voice / style) |

### 4.2 Document builders (dossier-linked)

| Builder | What it produces | How it connects |
|---------|------------------|-----------------|
| **Intake** | Structured intake from dossier files / PDF import / AI | Feeds TP hydration and employee facts |
| **Trajectplan Bouwer (TP 2026)** | Full 2e-spoor Trajectplan (5-step wizard → PDF) | AI autofill across sections; live preview; archive in TP Docs |
| **VGR** | Voortgangsrapportage (first + follow-up), hydrates from TP | Period history, applications, PoW, planning; PDF export |
| **CV** | Employee CV with layout, photo, share link, PDF | Autofill from dossier / intake; quality gates |

TP wizard structure (product fact): Voorblad → Gegevens werknemer → TP deel 3 (core content) → Bijlage 1 → Eindecontrole / export.

TP content domains covered by dedicated AI helpers include (non-exhaustive): inleiding, sociale achtergrond, belastbaarheidsprofiel, visie werknemer, visie loopbaanadviseur, AD-advies wording, persoonlijk profiel, zoekprofiel, PoW-meter, activities, intake sections.

### 4.3 AI & document intelligence

| Capability | Purpose |
|------------|---------|
| Document upload & analysis | Read intake PDFs/DOCX, medical/AD material, extract structured employee facts |
| Employee autofill | Fill dossier fields from documents (chatlike / legacy pipelines) |
| TP / CV / Intake / VGR generation | Draft prose and structured fields grounded in dossier |
| Gesprek → transcript → gespreksverslag | Meeting audio/text → structured intake-style notes |
| Mijn Stem | Advisor-specific writing preferences for more consistent tone |

**Important positioning:** AI accelerates **reading, structuring, and first draft**. Advisors still review, correct, and own the professional judgment. That review time is already in the ROI model.

### 4.4 Archive & delivery

| Module | Role |
|--------|------|
| TP Docs | Central library of exported TP PDFs |
| Print routes | Dedicated print/PDF views for TP, CV, VGR, Intake |
| CV share | Shareable CV surface for external viewing |

### 4.5 Operations: Reserveren (already live)

| Piece | Detail |
|-------|--------|
| Calendar | Week/day timeline (Europe/Amsterdam), 08:00–18:00 |
| Resources | **Rooms** and **parking** per location |
| Locations | Multi-location catalog (Rotterdam preferred in UX ordering) |
| Booking | Create / edit / cancel; notes; guest emails; confirmation emails |
| Admin | Space & location management (`/dashboard/reserveren/beheer`) |
| Access | Role-aware: who can manage spaces vs. own bookings |

**Why it matters in the ecosystem story:** advisors already live in VAT for dossiers; booking rooms/parking in the same app removes yet another disconnected calendar tool and keeps “where we work” next to “who we work for.”

### 4.6 Knowledge & support

| Module | Role |
|--------|------|
| Help / kenniscentrum | In-app articles by category |
| Help chat / tickets | Support loop with conversation context |
| MFA / auth | Secure access for sensitive re-integration data |

---

## 5. Ecosystem map (narrative)

```text
                    ┌─────────────────────────────────────┐
                    │         ValentineZ Assist Tool       │
                    └─────────────────────────────────────┘
                                      │
     ┌────────────────────────────────┼────────────────────────────────┐
     ▼                                ▼                                ▼
 Werkgever / Werknemer          Document builders                 Operations
 (single dossier)               Intake · TP · VGR · CV            Reserveren
     │                                │                           (room/parking)
     │         ┌──────────────────────┼──────────────────────┐
     │         ▼                      ▼                      ▼
     │   Document AI            Meeting → notes           Email confirms
     │   Autofill & drafts      (gespreksverslag)
     │         │                      │
     └─────────┴──────────► PDF export · TP Docs · CV share
                                      │
                         Future: CRM · billing · admin reporting
```

**Value of “connected”:** each module reuses the same employee/employer truth. A fact captured at intake or in a gesprek can surface in TP, VGR, and CV without retyping. That is the opposite of five SaaS tools with five copies of the same person.

---

## 6. Time-savings model (transparent assumptions)

These are **working assumptions** for negotiation and planning. Replace with measured stopwatch samples when available.

### 6.1 Fully loaded cost of advisor time

| Assumption | Value | Rationale |
|------------|------:|-----------|
| Fully loaded hourly cost | **€65 / hour** | Conservative NL professional services (salary + employer costs + overhead). Raise to €75–€90 for a more aggressive internal case. |

### 6.2 Trajectplan (TP) — per document

| Phase | Manual / fragmented | With VAT + AI | Saved |
|-------|--------------------:|--------------:|------:|
| Read & analyse source docs (intake, FML/IZP, AD, notes) | 2.5 h | 0.25 h (AI + skim) | 2.25 h |
| Draft / write sections | 3.0 h | 1.25 h (review & edit AI draft) | 1.75 h |
| Format, consistency, PDF export | 0.5 h | 0.25 h | 0.25 h |
| **Total** | **6.0 h** | **1.75 h** | **4.25 h (≈71%)** |

**Money saved per TP (labor):** 4.25 × €65 = **€276**

### 6.3 CV — per document

| | Manual | With VAT | Saved |
|--|-------:|---------:|------:|
| Gather, write, format | 2.0 h | 0.5 h | **1.5 h (75%)** |

**Money saved per CV:** 1.5 × €65 = **€98**

### 6.4 Adjacent documents (for completeness; volumes not yet given)

| Document | Manual | With VAT | Hours saved | € saved @ €65 |
|----------|-------:|---------:|------------:|--------------:|
| VGR (typical follow-up) | 3.0 h | 1.0 h | 2.0 h | €130 |
| Intake structuring | 1.5 h | 0.4 h | 1.1 h | €72 |
| Gespreksverslag from recording | 1.5 h | 0.25 h | 1.25 h | €81 |

Use these when volume data exists; do not invent cumulative totals yet.

### 6.5 Reserveren — coordination time

| Assumption | Value |
|------------|------:|
| Time saved vs. email/Teams chase per booking | 10–15 min |
| Org bookings / week (placeholder) | 20–40 |
| Weekly hours saved (mid) | ~5–8 h |
| Annual labor value @ €65 (mid ~6.5 h/week × 46 weeks) | **≈ €19k / year** |

Plus soft value: fewer double bookings, clearer parking/room ownership, fewer “who has the key?” threads.

### 6.6 Value already realized on documented volume (to date)

Using only TP + CV counts you supplied:

| Item | Volume | Hours saved | Labor € saved |
|------|-------:|------------:|--------------:|
| Trajectplannen | 325 | 1,381 h | **€89,800** |
| CVs | 164 | 246 h | **€16,000** |
| **Subtotal (documented)** | | **1,627 h** | **≈ €105,800** |

This is **historical labor value**, not yet “per year.” It also understates total value if VGR/intake/gesprek/reserveren were included, and overstates if some TPs/CVs were produced with low AI adoption (partial use).

---

## 7. Capacity & revenue leverage (the “4 people” story)

Assume four advisors spend **~20 productive hours/week** on document-heavy casework (rest = conversations, travel, employer contact).

| Mode | Hours / week on docs | Hours / TP | TP capacity / week | TP capacity / year (46 w) |
|------|---------------------:|-----------:|-------------------:|--------------------------:|
| Manual | 80 | 6.0 | ≈ 13 | ≈ 610 |
| With VAT | 80 | 1.75 | ≈ 46 | ≈ 2,100 |
| **Uplift** | | | **≈ 3.4×** | **≈ +1,490 TP slots / year** |

**Interpretation (use carefully externally):**

- Same headcount can carry more concurrent dossiers, or the same volume with less overtime / backlog.
- If each incremental completed trajectory contributes margin `M`, annual upside ≈ `extra TPs × M × utilization`.
- Example placeholder: if incremental contribution margin were **€800 / TP** and the team fills **30%** of the theoretical extra capacity → `1,490 × 0.30 × €800 ≈ €358k / year` revenue-capacity value. **Replace €800 and 30% with real finance numbers before negotiation.**

Even without revenue uplift, labor savings alone are material (section 6–8).

---

## 8. Forward ROI — 1 year and 5 years (with growth)

### 8.1 Baseline for projections

Because the cumulative window for 325 TP / 164 CV is not fixed, we define a **Year-0 run-rate** you can swap:

| Scenario label | Assumed Year-0 annual volume | How to read it |
|----------------|-----------------------------:|----------------|
| **A — Conservative** | 325 TP · 164 CV | Treat current totals as ~1 year of output |
| **B — Mid** | 450 TP · 220 CV | Mild ramp from current installed base |
| **C — Growth** | 600 TP · 300 CV | Stronger adoption + more users on full workflow |

All scenarios below also apply:

- Labor rate €65/h  
- Savings rates: 4.25 h/TP, 1.5 h/CV  
- Reserveren labor: €19k/year constant (until CRM era)  
- Tool-consolidation (subscriptions avoided): **€18k/year** working assumption  
  (~€50/user/month × 30 users for generic AI + ad-hoc tools — validate against actual invoices)  
- **Volume growth YoY:** Conservative 15% · Base 25% · Stretch 40%  
- Adoption quality factor (share of volume getting full AI benefit): 70% → 85% → 95% over years in Base path

### 8.2 Year-1 estimated value (labor + tools + booking)

Formula per year:

`Value ≈ (TPs × 4.25 × €65 × adoption) + (CVs × 1.5 × €65 × adoption) + booking + subscriptions`

| Year-1 path | TP vol | CV vol | Adoption | Doc labor € | + Booking | + Subs | **Year-1 total** |
|-------------|-------:|-------:|---------:|------------:|----------:|-------:|-----------------:|
| A Conservative | 325 | 164 | 70% | €74k | €19k | €18k | **≈ €111k** |
| B Mid | 450 | 220 | 80% | €116k | €19k | €18k | **≈ €153k** |
| C Growth | 600 | 300 | 85% | €170k | €19k | €18k | **≈ €207k** |

### 8.3 Five-year cumulative (Base growth path = Mid volumes + 25% YoY)

Starting Year-1 = Mid (€153k), then grow document volumes 25%/year; adoption steps 80% → 85% → 90% → 93% → 95%; booking + subs held flat until CRM (see §9).

| Year | Approx. annual value | Cumulative |
|-----:|---------------------:|-----------:|
| 1 | €153k | €153k |
| 2 | €195k | €348k |
| 3 | €250k | €598k |
| 4 | €320k | €918k |
| 5 | €410k | **≈ €1.33M** |

**Stretch (40% YoY from Growth Year-1 €207k):** cumulative 5-year often lands in the **€1.8M–€2.2M** band under the same labor assumptions.  
**Conservative (15% YoY from €111k):** cumulative ~**€0.75M–€0.85M**.

### 8.4 What these numbers are — and are not

**Are:** order-of-magnitude business case for internal negotiation; sensitive to hourly rate and hours saved.  
**Are not:** audited financials; do not include revenue from extra cases unless finance adds margin `M`.  
**Sensitivity:** ±1 hour saved per TP moves Year-1 Mid by roughly `450 × 1 × €65 × 0.8 ≈ €23k`.

---

## 9. Future upside — CRM & internal administration

Not built as a full CRM yet; this is **strategic roadmap value** for the ecosystem story.

### 9.1 What “CRM + admin inside VAT” would absorb

- Employer pipeline & contract status next to dossiers  
- Case stage / SLA / deadline tracking (intake → TP → interventions → VGR → exit)  
- Advisor workload & caseload dashboards  
- Billing-ready activity logs / export for finance  
- Unified reporting for management (instead of spreadsheet archaeology)  
- Fewer handoffs between “document tool” and “admin tool”

### 9.2 Extra savings band (estimate when integrated)

| Lever | Low / year | High / year | Notes |
|-------|----------:|------------:|-------|
| Eliminate double entry (CRM ↔ docs) | €25k | €60k | ~15–30 min × cases × rate |
| Management reporting automation | €15k | €40k | Hours of monthly pack building |
| Reduce parallel CRM / admin SaaS | €10k | €35k | License consolidation |
| Error / rework / missed deadlines | €10k | €40k | Soft but material in 2e-spoor |
| **CRM-era add-on** | **€60k** | **€175k** | Layer on top of §8 |

Illustrative: Mid path Year-3 (~€250k) **+ €100k CRM** → ~€350k/year run-rate once adopted.

### 9.3 Five-year story with CRM from Year 3

Keep §8.3 Base cumulative through Year 2 (€348k), then add ~€100k/year CRM value in Years 3–5:

| | Without CRM | With CRM from Y3 |
|--|------------:|-----------------:|
| 5-year cumulative (Base) | ≈ €1.33M | **≈ €1.63M** |

Use as **upside narrative**, clearly labeled “roadmap.”

---

## 10. Qualitative benefits (non-€, still decision-relevant)

- **One truth:** employer/employee data not scattered across drives and chats  
- **Quality consistency:** structured TP/VGR/CV; fewer missing sections  
- **Compliance posture:** role-based access, MFA path, dossier-scoped visibility  
- **Onboarding speed:** new advisors learn one system + in-app help  
- **Less cognitive load:** reservations beside caseload  
- **Negotiation clarity:** measurable outputs (325 TPs, 164 CVs) already exist  
- **Adoption headroom:** ~30 users with uneven usage → savings grow as more people use full AI flows

---

## 11. Risks & honesty (keep for internal; strip for public)

- Usage is uneven; not every user captures the full 71% TP saving today  
- Hours-saved are modeled, not yet time-and-motion measured  
- Cumulative TP/CV period must be confirmed before “per year” claims externally  
- AI drafts require professional review (liability / quality)  
- CRM value is prospective  
- Subscription-savings (€18k) need invoice-level proof

---

## 12. Asset guidance — what to keep / discard later

This master file is the **superset**. When building specific assets:

| Asset | Keep | Discard / soften |
|-------|------|------------------|
| **Internal one-pager** | Thesis, ecosystem diagram, 325/164/218/30, €/TP, Year-1 Mid, 5-year cumulative, capacity 3.4×, CRM upside band | Stretch revenue `M` unless finance signs off |
| **Public one-pager** | Thesis, connected ecosystem, time % saved, rounded stats (“200+ werkgevers”, “300+ TPs”, “150+ CVs”), no € labor internals if sensitive | Exact 218, €65 rate, 5-year € millions, CRM € bands |
| **Use case** | Persona (loopbaanadviseur), before/after day-in-the-life, TP+CV+Reserveren flow, quote-ready outcomes | Full scenario tables |
| **Presentation deck** | Problem → ecosystem → proof stats → ROI 1 & 5 yr → capacity → roadmap CRM → ask | Dense assumption footnotes (appendix slide only) |

---

## 13. Open decisions for you

1. Confirm **time window** for 325 TPs / 164 CVs (e.g. since go-live date).  
2. Confirm or replace **€65/h** and hours-saved table with advisor reality.  
3. Decide public rounding rules (exact vs. “200+”).  
4. Decide whether **revenue capacity** (extra TPs × margin) is allowed in negotiation materials.  
5. List **current parallel subscriptions** to harden the consolidation € claim.  
6. Priority order of next assets: one-pager internal → deck → use case → public.

---

## 14. Quick reference — headline figures

| Headline | Figure |
|----------|-------|
| Users | ~30 |
| Werkgevers | 218 |
| TPs generated | 325 |
| CVs generated | 164 |
| Hours saved / TP (model) | 4.25 h (~71%) |
| Hours saved / CV (model) | 1.5 h (~75%) |
| Labor € / TP | ~€276 |
| Labor € / CV | ~€98 |
| Value to date (TP+CV labor only) | ~€106k |
| Year-1 Mid total value | ~€153k |
| 5-year Base cumulative | ~€1.3M |
| 5-year Base + CRM from Y3 | ~€1.6M |
| Capacity multiplier (4 advisors, doc hours) | ~3.4× |

---

*Next step after your keep/discard pass: freeze assumptions, then generate the first concrete asset (recommended: internal one-pager + slide outline).*
