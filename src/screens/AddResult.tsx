import { useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Sheet } from '../components/Sheet'
import { btn } from '../components/buttons'
import { Field, selectCls } from '../components/ui'
import { PARTNER_LABS } from '../data/labs'
import { formatDate, toIso, today } from '../lib/dates'
import { formatResult, kindOf, TEST_KINDS, TESTS } from '../lib/tests'
import type { TestKind, TestResult, Unit } from '../lib/types'
import { scanReport, type ScannedResult } from '../services/ai'

interface Props {
  unit: Unit
  defaultLab?: string
  defaultKind?: TestKind
  aiEnabled: boolean
  existing: TestResult[]
  onClose: () => void
  onSave: (results: TestResult[]) => void
}

// New results used in the live demo (storage units). Fasting blood sugar: 103 mg/dL ≈ 5.7 mmol/L, a slight upward drift.
const DEMO: Record<TestKind, { value: number; value2?: number }> = {
  fbs: { value: 103 },
  hba1c: { value: 5.6 },
  bp: { value: 126, value2: 82 },
  chol: { value: 212 },
}
const OTHER_LAB = 'Other lab'

function fromScan(s: ScannedResult): { value: number; value2?: number } {
  const def = TESTS[s.test]
  const value = s.unit === 'mmol/L' ? def.fromDisplay(s.value, 'mmol') : s.value
  return { value: Math.round(value * 10) / 10, value2: s.value2 }
}

export function AddResult({ unit, defaultLab, defaultKind = 'fbs', aiEnabled, existing, onClose, onSave }: Props) {
  const [kind, setKind] = useState<TestKind>(defaultKind)
  const [value, setValue] = useState('')
  const [value2, setValue2] = useState('')
  const [date, setDate] = useState(toIso(today()))
  const [lab, setLab] = useState(defaultLab ?? PARTNER_LABS[0].name)
  const [scanning, setScanning] = useState(false)
  const [scanMsg, setScanMsg] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null)
  const [batch, setBatch] = useState<TestResult[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const def = TESTS[kind]
  const todayIso = toIso(today())
  const main = def.fromDisplay(Number(value), unit)
  const second = Number(value2)
  const inRange = value !== '' && main >= def.valid[0] && main <= def.valid[1] && (!def.paired || (value2 !== '' && second >= 40 && second <= 160 && second < main))
  const valid = inRange && date <= todayIso
  const labOptions = [...PARTNER_LABS.map((l) => l.name), ...(lab && !PARTNER_LABS.some((l) => l.name === lab) && lab !== OTHER_LAB ? [lab] : []), OTHER_LAB]
  const display = (v: number) => def.toDisplay(v, unit).toFixed(def.decimals(unit))

  const pickKind = (k: TestKind) => {
    setKind(k)
    setValue('')
    setValue2('')
  }

  const fillDemo = () => {
    const d = DEMO[kind]
    setValue(display(d.value))
    setValue2(d.value2 !== undefined ? String(d.value2) : '')
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    setScanning(true)
    setScanMsg(null)
    setBatch(null)
    try {
      const out = await scanReport(file)
      const found = out.results.filter((r) => r.value > 0 && TESTS[r.test] && (!r.date || r.date <= todayIso))
      if (!out.found || found.length === 0) {
        setScanMsg({ tone: 'warn', text: out.notes || 'No supported test result found on this report.' })
      } else if (found.length === 1) {
        const r = found[0]
        const v = fromScan(r)
        setKind(r.test)
        setValue(TESTS[r.test].toDisplay(v.value, unit).toFixed(TESTS[r.test].decimals(unit)))
        setValue2(v.value2 !== undefined ? String(v.value2) : '')
        if (r.date) setDate(r.date)
        if (r.lab) setLab(r.lab)
        setScanMsg({ tone: 'ok', text: `Read ${r.testName || TESTS[r.test].name}. Check the details, then save.${out.notes ? ` ${out.notes}` : ''}` })
      } else {
        // Multi-result report (e.g. a full panel or a history printout): import everything not already logged.
        const key = (r: TestResult) => `${kindOf(r)}|${r.date}|${Math.round(r.value)}`
        const seen = new Set(existing.map(key))
        const fresh = found
          .map<TestResult>((r) => ({ id: crypto.randomUUID(), kind: r.test, date: r.date || todayIso, ...fromScan(r), source: 'manual', lab: r.lab || undefined }))
          .filter((r) => !seen.has(key(r)))
        setBatch(fresh)
        setScanMsg({ tone: fresh.length ? 'ok' : 'warn', text: fresh.length ? `Found ${found.length} results.` : 'All results on this report are already in LabLink.' })
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
                    {TESTS[kindOf(r)].name}
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(r.date)}
                      {r.lab ? `, ${r.lab}` : ''}
                    </span>
                  </td>
                  <td className="text-right font-semibold">{formatResult(r, unit)}</td>
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
            onSave([
              {
                id: crypto.randomUUID(),
                kind,
                date,
                value: Math.round(main * 10) / 10,
                value2: def.paired ? second : undefined,
                source: 'manual',
                lab,
              },
            ])
          }}
        >
          <Field label="Test" group>
            <div className="grid grid-cols-2 gap-2">
              {TEST_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={kind === k}
                  onClick={() => pickKind(k)}
                  className={cn(
                    'rounded-2xl border px-3 py-2.5 text-left text-sm font-medium transition-colors',
                    kind === k ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-input/30 hover:bg-muted',
                  )}
                >
                  {TESTS[k].name}
                </button>
              ))}
            </div>
          </Field>

          {def.paired ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Systolic (top, mmHg)">
                <Input type="number" inputMode="numeric" placeholder={`e.g. ${def.sample.value}`} className="h-12 text-lg font-semibold md:text-lg" value={value} onChange={(e) => setValue(e.target.value)} />
              </Field>
              <Field label="Diastolic (bottom, mmHg)">
                <Input type="number" inputMode="numeric" placeholder={`e.g. ${def.sample.value2}`} className="h-12 text-lg font-semibold md:text-lg" value={value2} onChange={(e) => setValue2(e.target.value)} />
              </Field>
            </div>
          ) : (
            <Field label={`${def.name} (${def.unit(unit)})`}>
              <Input
                type="number"
                inputMode="decimal"
                step={def.decimals(unit) ? 0.1 : 1}
                placeholder={`e.g. ${display(def.sample.value)}`}
                className="h-12 text-lg font-semibold md:text-lg"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </Field>
          )}
          <button type="button" onClick={fillDemo} className="text-sm font-medium text-accent-foreground hover:underline">
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
          {(value !== '' || value2 !== '') && !valid && (
            <p role="alert" className="text-sm font-medium text-destructive">
              Enter a realistic value{def.paired ? ' for both numbers' : ''} and a date that is not in the future.
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
