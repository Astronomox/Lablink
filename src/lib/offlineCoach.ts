/** Rule-based coach replies used when the AI service isn't configured or reachable. */
import type { Insight } from './intelligence'
import type { RiskResult } from './risk'
import { bandOf, formatResult, resultsOf, TESTS } from './tests'
import type { Profile, TestKind, TestResult } from './types'

/** Which test a question is about, if it names one. */
function testIn(q: string): TestKind | undefined {
  if (/pressure|\bbp\b|hypertension|salt/.test(q)) return 'bp'
  if (/cholesterol|lipid|\bfat|palm oil/.test(q)) return 'chol'
  if (/a1c/.test(q)) return 'hba1c'
  if (/sugar|glucose|diabet|\bfbs\b/.test(q)) return 'fbs'
  return undefined
}

export function offlineReply(
  question: string,
  profile: Profile,
  results: TestResult[],
  insights: Partial<Record<TestKind, Insight | null>>,
  risk: RiskResult | null,
  focus: TestKind = 'fbs',
): string {
  const q = question.toLowerCase()
  const kind = testIn(q) ?? focus
  const def = TESTS[kind]
  const insight = insights[kind] ?? null
  const latest = resultsOf(results, kind).at(-1)
  const latestText = latest ? `${formatResult(latest, profile.unit)} (${bandOf(latest).label.toLowerCase()})` : 'not on record yet'

  if (/chest pain|severe headache|thirst|urinat|blur|weight loss|faint|confus|dizz|symptom/.test(q)) {
    return 'Symptoms like chest pain, a severe headache, extreme thirst, passing urine often, blurred vision, unexplained weight loss or feeling faint should be checked by a doctor promptly. Please don’t wait for your next routine test. If you feel very unwell, go to the nearest hospital.'
  }
  if (/food|eat|diet|rice|swallow|bread|drink|zobo|malt|cook/.test(q)) {
    if (kind === 'bp' || kind === 'chol') {
      return [`A few changes that help your ${def.noun}:`, ...def.lifestyle(profile).map((a) => `- ${a}`), `Your latest ${def.measure} is ${latestText}.`].join('\n')
    }
    return [
      'A few swaps that make a real difference for blood sugar:',
      '- Replace soft drinks, malt and sweetened zobo with water or unsweetened zobo',
      '- Halve your portion of white rice, eba or bread and fill the plate with vegetables (efo, ugu, okra) and beans or moi moi',
      '- Choose unripe or roasted plantain over fried ripe plantain',
      '- Eat dinner earlier and avoid late-night snacks',
      `Your latest ${def.measure} is ${latestText}, so these changes are worth starting now.`,
    ].join('\n')
  }
  if (/exercise|walk|active|gym|activity/.test(q)) {
    return 'Aim for 30 minutes of brisk walking at least 5 days a week. Splitting it into three 10-minute walks after meals works well, and helps blood sugar, blood pressure and cholesterol. Taking stairs and walking short trips instead of using a keke all count.'
  }
  if (/risk|chance|likely/.test(q) && risk) {
    return `Your FINDRISC score is ${risk.score}/26 (${risk.band}), which suggests a 10-year type 2 diabetes risk of ${risk.tenYearRisk}. Open the Risk screen to see which factors add the most points and how changes such as losing weight or walking daily would lower it.`
  }
  if (/doctor|hospital|clinic|see a/.test(q)) {
    const urgent = Object.values(insights).find((i) => i?.level === 'urgent')
    return urgent
      ? `Yes. ${urgent.headline}, so please see a doctor within the next two weeks. Use “Share with doctor” on the home screen to bring a summary of your results.`
      : 'A doctor’s visit is a good idea if any result keeps rising or moves out of the healthy range. Use “Share with doctor” on the home screen to bring a summary of your history.'
  }
  if (insight) {
    return `${insight.headline}. ${insight.explanation}\n\nYour latest ${def.measure} is ${latestText}. Next steps:\n${insight.actions
      .slice(0, 3)
      .map((a) => `- ${a}`)
      .join('\n')}`
  }
  return `There is no ${def.measure} result on record yet. Add one and I’ll explain what it means and what to watch for.`
}
