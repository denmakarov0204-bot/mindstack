import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types
export interface Member {
  id: string
  name: string
  telegram_username: string
  business_niche: string
  role: 'admin' | 'moderator' | 'member'
  avatar_color: string
  is_active: boolean
  joined_at: string
}

export interface DailyReport {
  id: string
  member_id: string
  date: string
  status: 'submitted' | 'missing' | 'late'
  submitted_at: string | null
  content: string | null
}

export interface Fine {
  id: string
  member_id: string
  amount: number
  reason: string
  reason_type: 'missed_report' | 'missed_meeting' | 'late_to_meeting' | 'other'
  is_auto: boolean
  created_at: string
}

export interface Meeting {
  id: string
  meeting_number: number
  date: string
  status: 'planned' | 'active' | 'completed'
  ai_summary: string | null
}

export interface MemberFineBalance {
  id: string
  name: string
  telegram_username: string
  total_charged: number
  total_paid: number
  debt: number
}

export interface TodayReportStatus {
  id: string
  name: string
  telegram_username: string
  report_status: 'submitted' | 'missing' | 'late'
  submitted_at: string | null
}

export interface DisciplineScore {
  member_id: string
  name: string
  score: number
  reports_score: number
  meetings_score: number
  updated_at?: string
}

export interface MeetingAttendance {
  id: string
  meeting_id: string
  member_id: string
  attended: boolean
  created_at: string
  updated_at: string
}
