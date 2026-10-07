import type { Insight } from '../lib/intelligence'

/** The analysis text for a set of results: headline, explanation, next steps. */
export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div>
      <p className="text-[15px] font-semibold">{insight.headline}</p>
      <p className="mt-1">{insight.explanation}</p>
      <h3 className="mt-3 font-semibold">What to do</h3>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {insight.actions.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      {insight.riskFactors.length > 0 && <p className="mt-3 text-sm text-muted-foreground">Risk factors: {insight.riskFactors.join('; ')}.</p>}
    </div>
  )
}
