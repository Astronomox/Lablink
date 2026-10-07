import { useRef, useState } from 'react'
import { Sheet } from '../components/Sheet'
import { btn } from '../components/buttons'
import { Field, selectCls } from '../components/ui'
import { Input } from '@/components/ui/input'
import { PARTNER_LABS } from '../data/labs'
import { formatDate, toIso, today } from '../lib/dates'
import { formatValue, fromDisplay, MGDL_PER_MMOL, toDisplay, unitLabel } from '../lib/glucose'
import type { TestResult, Unit } from '../lib/types'
import { scanReport, type ScannedResult } from '../services/ai'

interface Props {
  unit: Unit
  defaultLab?: string
  aiEnabled: boolean
  existing: TestResult[]
  onClose: () => void
  onSave: (results: TestResult[]) => void
}

// Slight upward drift used in the live demo: 103 mg/dL ≈ 5.7 mmol/L.
const DEMO_MGDL = 103
const OTHER_LAB = 'Other lab'

function scannedToMgDl(s: ScannedResult): number {
  return Math.round((s.unit === 'mmol/L' ? s.value * MGDL_PER_MMOL : s.value) * 10) / 10
}

export function AddResult({ unit, defaultLab, aiEnabled, existing, onClose, onSave }: Props) {
  const [value, setValue] = useState('')
  const [date, setDate] = useState(toIso(today()))
  const [lab, setLab] = useState(defaultLab ?? PARTNER_LABS[0].name)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)
  const [batch, setBatch] = useState<TestResult[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const num = Number(value)
  const mgdl = fromDisplay(num, unit)
  const todayIso = toIso(today())
  const valid = value !== '' && mgdl >= 40 && mgdl <= 600 && date <= todayIso
  const labOptions = [...PARTNER_LABS.map((l) => l.name), ...(lab && !PARTNER_LABS.some((l) => l.name === lab) && lab !== OTHER_LAB ? [lab] : []), OTHER_LAB]

  async function onFile(file: File | undefined) {
    if (!file) return
    setScanning(true)
    setScanMsg(null)
    setBatch(null)
    try {
      const out = await scanReport(file)
      const valid = out.results.filter((r) => r.value > 0 && (!r.date || r.date <= todayIso))
      if (!out.found || valid.length === 0) {
        setScanMsg({ tone: 'warn', text: out.notes || 'No fasting blood sugar result found on this report.' })
      } else if (valid.length === 1) {
        const r = valid[0]
        const m = scannedToMgDl(r)
        setValue(unit === 'mmol' ? toDisplay(m, 'mmol').toFixed(1) : String(Math.round(m)))
        if (r.date) setDate(r.date)
        if (r.lab) setLab(r.lab)
        setScanMsg({ tone: 'ok', text: `Read ${r.testName || 'fasting glucose'}: ${r.value} ${r.unit}. Check the details, then save.${out.notes ? ` ${out.notes}` : ''}` })
      } else {
        // Multi-result report (e.g. a history printout): import everything not already logged.
        const seen = new Set(existing.map((e) => `${e.date}|${Math.round(e.valueMgDl)}`))
        const fresh = valid
          .map<TestResult>((r) => ({ id: crypto.randomUUID(), date: r.date || todayIso, valueMgDl: scannedToMgDl(r), source: 'manual', lab: r.lab || undefined }))
          .filter((r) => !seen.has(`${r.date}|${Math.round(r.valueMgDl)}`))
        setBatch(fresh)
        setScanMsg({ tone: fresh.length ? 'ok' : 'warn', text: fresh.length ? `Found ${valid.length} results.` : 'All results on this report are already in LabLink.' })
      }
    } catch (err) {
      setScanMsg({ tone: 'warn', text: (err as Error).message })
    }
    setScanning(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <Sheet title="Add a result" onClose={onClose}>
      <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <button type="button" disabled={scanning || !aiEnabled} onClick={() => fileRef.current?.click()} className={`${btn('secondary', 'lg')} w-full`}>
        {scanning ? 'Reading your report…' : 'Scan a lab report (photo or PDF)'}
      </button>
      {!aiEnabled && <p className="mt-2 text-xs text-muted-foreground">Scanning needs the AI service, which is not set up on this server.</p>}
      {scanMsg && (
        <p role="status" className={`mt-3 rounded-2xl px-4 py-3 text-sm ${scanMsg.tone === 'ok' ? 'bg-accent text-accent-foreground' : 'bg-amber-50 text-amber-800'}`}>
          {scanMsg.text}
        </p>
      )}

      {batch && batch.length > 0 ? (
        <div className="mt-4">
          <table className="w-full text-sm">
            <tbody className="[&_td]:border-b [&_td]:border-border [&_td]:py-2.5">
              {batch.map((r) => (
                <tr key={r.id}>
                  <td>
                    {formatDate(r.date)}
                    {r.lab && <span className="block text-xs text-muted-foreground">{r.lab}</span>}
                  </td>
                  <td className="text-right font-semibold">{formatValue(r.valueMgDl, unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className={`${btn('primary', 'lg')} mt-4 w-full`} onClick={() => onSave(batch)}>
            Save {batch.length} result{batch.length > 1 ? 's' : ''}
          </button>
        </div>
      ) : (
        <form
          className="mt-5 space-y-5 border-t border-border pt-5"
          onSubmit={(e) => {
            e.preventDefault()
            if (!valid) return
            onSave([{ id: crypto.randomUUID(), date, valueMgDl: Math.round(mgdl * 10) / 10, source: 'manual', lab }])
          }}
        >
          <Field label={`Fasting blood sugar (${unitLabel(unit)})`}>
            <Input
              type="number"
              inputMode="decimal"
              step={unit === 'mmol' ? 0.1 : 1}
              placeholder={unit === 'mmol' ? 'e.g. 5.4' : 'e.g. 97'}
              className="h-12 text-lg font-semibold md:text-lg"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <button type="button" onClick={() => setValue(unit === 'mmol' ? (DEMO_MGDL / MGDL_PER_MMOL).toFixed(1) : String(DEMO_MGDL))} className="text-sm font-medium text-primary hover:underline">
            Demo: fill a new result
          </button>
          <div className="grid gap-4 min-[380px]:grid-cols-2 min-[380px]:gap-3">
            <Field label="Test date">
              <Input type="date" max={todayIso} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Lab">
              <select className={selectCls} value={lab} onChange={(e) => setLab(e.target.value)}>
                {labOptions.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
          </div>
          {value !== '' && !valid && (
            <p role="alert" className="text-sm font-medium text-destructive">
              Enter a realistic value and a date that is not in the future.
            </p>
          )}
          <button type="submit" disabled={!valid} className={`${btn('primary', 'lg')} w-full`}>
            Save & analyse
          </button>
        </form>
      )}
    </Sheet>
  )
}
