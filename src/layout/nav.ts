import { Bot, FileText, FlaskConical, Gauge, LayoutDashboard, ScrollText, UserRound, type LucideIcon } from 'lucide-react'

export type Screen = 'home' | 'results' | 'labs' | 'coach' | 'risk' | 'report' | 'profile'

export interface NavItem {
  id: Screen
  /** Label used in the desktop menu bar, side menu and page title. */
  label: string
  /** Short label for the mobile tab bar. */
  short: string
  icon: LucideIcon
  description: string
}

export const NAV: NavItem[] = [
  { id: 'home', label: 'Dashboard', short: 'Home', icon: LayoutDashboard, description: '' },
  { id: 'results', label: 'My Results', short: 'Results', icon: ScrollText, description: 'All fasting blood sugar results on record.' },
  { id: 'labs', label: 'Labs & Booking', short: 'Labs', icon: FlaskConical, description: 'Partner labs near you. Fast for 8 to 12 hours before a fasting blood sugar test.' },
  { id: 'coach', label: 'Health Coach', short: 'Coach', icon: Bot, description: 'Questions about your results, trend and risk score.' },
  { id: 'risk', label: 'Risk Check', short: 'Risk', icon: Gauge, description: 'FINDRISC score: your 10-year risk of type 2 diabetes.' },
  { id: 'report', label: 'Doctor’s Summary', short: 'Summary', icon: FileText, description: 'One-page summary to print or share with your doctor.' },
  { id: 'profile', label: 'My Profile', short: 'Profile', icon: UserRound, description: 'Personal details and settings.' },
]

export const navItem = (id: Screen): NavItem => NAV.find((n) => n.id === id) ?? NAV[0]
