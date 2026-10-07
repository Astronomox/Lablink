# LabLink

Health intelligence web app for tracking Fasting Blood Sugar (FBS) drift, finding nearby partner labs, and getting retest reminders. Mobile-first: open it on a phone or a narrow browser window.

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (also exposed on your LAN for phones)
```

Use `npm run dev` or `npm run preview` for the demo — both proxy the MyHealthfinder API and serve the AI endpoints. Without them the app falls back to cached recommendations and offline coaching.

### Enable AI (Coach, report scan, clinical note)

```bash
cp .env.example .env.local   # then paste your key after ANTHROPIC_API_KEY=
npm run dev
```

The key is read only by the Vite server (`server/ai.ts`) and never reaches the browser. Without a key the Coach answers from built-in rules and scanning is disabled.

## 3-minute demo script

1. **Landing → Onboarding** — the public homepage opens first; **Enrol now** starts enrolment. The profile is pre-filled (Tobi, 38, BMI 27, family history). Continue → **Import my lab history** pulls 6 FBS results from the (mock) Founda Health FHIR API.
2. **Dashboard** — trend chart shows a slow upward drift still in the normal range. Reminder card: *"You are due for your 3-month routine blood sugar checkup"* (overdue by 10 days). Insight card projects reaching prediabetes in ~4 months. MyHealthfinder recommendations are live for the profile.
3. **Find a lab** — tap the reminder → map + list of partner labs by distance, open-now status, price. **Book test** → pick a slot → dashboard shows the booking.
4. **New result** — **Add result** → **Demo: fill a new result** (5.7 mmol/L) → **Save & analyse** → insight: *crossed into the prediabetes range* with next steps.
5. **AI Coach** — tap **Ask Coach about this** under the insight, or the Coach tab. Claude answers using the user's own results, trend and risk score.
6. **Risk what-if** — tap the risk card (12/26). Drag *Lose kg*, tick *Walk daily* → score drops live. **Ask Coach for a plan**.
7. **Share with doctor** — one-page summary with chart, table, risk and questions; **Write with AI** drafts an SBAR clinical note; **Print / PDF** or **Share**.
8. **Scan a lab report** — in Add result, snap a photo/PDF of a lab report; Claude extracts the fasting glucose value(s).

Reset any time from **Profile → Reset demo**.

## How it works

| Area | File | Notes |
| --- | --- | --- |
| Drift detection | `src/lib/intelligence.ts` | Category change, % change vs last test, rising streak, least-squares trend over last 4 tests, projection to the 100 mg/dL cut-off |
| Retest reminders | `src/lib/reminders.ts` | 1 month (diabetes range), 3 months (drifting/prediabetes), 6 months (stable) after the last test |
| Thresholds & units | `src/lib/glucose.ts` | ADA cut-offs: 100 / 126 mg/dL (5.6 / 7.0 mmol/L). Stored in mg/dL |
| Founda Health | `src/services/founda.ts` | Mock FHIR R4 `Observation` bundle (LOINC 1558-6, IHE QEDm shape). Replace `fetchBundle` with the live endpoint |
| MyHealthfinder v4 | `src/services/healthfinder.ts` | Live via Vite proxy, cached fallback |
| AI endpoints | `server/ai.ts` | Vite plugin serving `/api/ai/{status,coach,scan}` with Claude Opus 5.5 (streaming chat, structured-output extraction, server-side refusal fallback) |
| Risk score | `src/lib/risk.ts` | FINDRISC (Lindström & Tuomilehto 2003); high-glucose item auto-filled from results |
| Lab locator | `src/screens/Labs.tsx`, `src/data/labs.ts` | Leaflet + OpenStreetMap (no API key). Labs are fictional demo partners around Lagos Mainland |

Data is stored in `localStorage` for a single demo user (no auth, per the PRD scope).
