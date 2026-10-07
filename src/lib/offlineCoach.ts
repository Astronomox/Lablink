/** Rule-based coach replies used when the AI service isn't configured or reachable. */
import { CATEGORY_LABEL, categorize, formatValue } from './glucose'
import type { Insight } from './intelligence'
import type { RiskResult } from './risk'
import type { Profile, TestResult } from './types'

export function offlineReply(question: string, profile: Profile, results: TestResult[], insight: Insight | null, risk: RiskResult | null): string {
  const q = question.toLowerCase()
  const latest = results.at(-1)
  const latestText = latest ? `${formatValue(latest.valueMgDl, profile.unit)} (${CATEGORY_LABEL[categorize(latest.valueMgDl)].toLowerCase()})` : 'no results yet'

  if (/thirst|urinat|blur|weight loss|faint|confus|dizz|symptom/.test(q)) {
    return 'Symptoms like extreme thirst, passing urine often, blurred vision, unexplained weight loss or feeling faint should be checked by a doctor promptly — please don’t wait for your next routine test. If you feel very unwell, go to the nearest hospital.'
  }
  if (/food|eat|diet|rice|swallow|bread|drink|zobo|malt/.test(q)) {
    return [
      'A few swaps that make a real difference for fasting blood sugar:',
      '- Replace soft drinks, malt and sweetened zobo with water or unsweetened zobo',
      '- Halve your portion of white rice, eba or bread and fill the plate with vegetables (efo, ugu, okra) and beans or moi moi',
      '- Choose unripe or roasted plantain over fried ripe plantain',
      '- Eat dinner earlier and avoid late-night snacks',
      `Your latest result is ${latestText}, so these changes are worth starting now.`,
    ].join('\n')
  }
  if (/exercise|walk|active|gym|activity/.test(q)) {
    return 'Aim for 30 minutes of brisk walking at least 5 days a week — splitting it into three 10-minute walks after meals works well and helps blood sugar most. Taking stairs and walking short trips instead of using a keke all count.'
  }
  if (/risk|chance|likely/.test(q) && risk) {
    return `Your FINDRISC score is ${risk.score}/26 (${risk.band}), which suggests a 10-year type 2 diabetes risk of ${risk.tenYearRisk}. Open the Risk screen to see which factors add the most points and how changes such as losing weight or walking daily would lower it.`
  }
  if (/doctor|hospital|clinic|see a/.test(q)) {
    return insight?.level === 'urgent'
      ? 'Yes — your latest result is in the diabetes range, so please see a doctor within the next two weeks. Use “Share with doctor” on the home screen to bring a summary of your results.'
      : 'A doctor’s visit is a good idea if your results keep rising or cross into the prediabetes range. Use “Share with doctor” on the home screen to bring a one-page summary of your history.'
  }
  if (insight) {
    return `${insight.headline}. ${insight.explanation}\n\nYour latest result is ${latestText}. Next steps:\n${insight.actions
      .slice(0, 3)
      .map((a) => `- ${a}`)
      .join('\n')}`
  }
  return 'Add your first fasting blood sugar result and I’ll explain what it means and what to watch for.'
}
