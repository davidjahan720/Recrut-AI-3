export interface Client {
  id: string
  name: string
  contact_name: string
  contact_email: string
  notification_email: string
  sector: string
  type: 'prospect' | 'client'
  signed_at: string | null
  added_by: string | null
  created_at: string
}

export interface Job {
  id: string
  ref_code: string | null
  posted_by: string | null
  client_id: string
  title: string
  location: string
  contract_type: string
  description: string
  score_threshold: number
  status: 'active' | 'inactive' | 'closed'
  honoraires: number | null
  recruiter: string | null
  created_at: string
  clients?: { name: string; contact_email?: string | null }
}

export interface Application {
  id: string
  job_id: string
  candidate_name: string | null
  candidate_email: string | null
  cv_file_path: string
  cv_text: string | null
  score: number | null
  justification: string | null
  status: 'pending' | 'qualified' | 'rejected' | 'error'
  positive_points: string | null
  negative_points: string | null
  uploaded_by: string | null
  email_sent_at: string | null
  md_file_path: string | null
  created_at: string
}
