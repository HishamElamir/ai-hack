// ─── Core Types ────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department: string | null;
}

export interface NewHire {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  preferred_language: string;
  position: string;
  department: string;
  salary: number;
  currency: string;
  start_date: string;
  employment_type: string;
  country: string;
  city?: string;
  work_location?: string;
  status: string;
  progress_percentage: number;
  voice_session_completed: boolean;
  offer_accepted: boolean;
  session_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  hr_employee?: { id: string; full_name: string };
  benefits: Benefit[];
  contracts: ContractSummary[];
  questions: QuestionSummary[];
  conversations: ConversationSummary[];
  pending_questions: number;
  signed_contracts: number;
  total_contracts: number;
}

export interface NewHireListItem {
  id: string;
  full_name: string;
  email: string;
  position: string;
  department: string;
  status: string;
  start_date: string;
  created_at: string;
  progress_percentage: number;
  pending_questions: number;
  signed_contracts: number;
  total_contracts: number;
}

export interface Benefit {
  id: string;
  benefit_type: string;
  description: string;
  value?: number;
  currency: string;
  coverage_start_date?: string;
  is_active: boolean;
}

export interface Contract {
  id: string;
  contract_type: string;
  status: string;
  content?: string;
  s3_url?: string;
  version: number;
  generation_tokens?: number;
  ai_model?: string;
  new_hire_id?: string;
  new_hire_name?: string;
  created_at: string;
  updated_at: string;
}

export interface ContractSummary {
  id: string;
  contract_type: string;
  status: string;
  version: number;
  created_at: string;
}

export interface Question {
  id: string;
  new_hire_id: string;
  new_hire_name: string;
  question: string;
  category?: string;
  status: string;
  priority: string;
  asked_at: string;
  context?: string;
  hr_response?: string;
  answered_at?: string;
  new_hire?: {
    id: string;
    full_name: string;
    email: string;
    position: string;
  };
  conversation?: { id: string };
}

export interface QuestionSummary {
  id: string;
  question: string;
  status: string;
  priority: string;
  asked_at: string;
  conversation_id?: string | null;
  conversation_start_time?: string | null;
}

export interface ConversationSummary {
  id: string;
  start_time: string;
  duration_seconds?: number;
  completion_status?: string;
  summary?: string | null;
  sentiment_score?: number | null;
  engagement_score?: number | null;
  language?: string | null;
  message_count?: number | null;
}

export interface ConversationTranscript {
  conversation_id: string;
  new_hire_name: string;
  start_time: string;
  end_time?: string | null;
  duration_seconds?: number | null;
  language: string;
  messages: {
    speaker: "agent" | "new_hire";
    message: string;
    timestamp?: string | null;
    audio_url?: string | null;
  }[];
  full_transcript?: string | null;
  summary?: string | null;
  sentiment_score?: number | null;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  template_type: string;
  country: string;
  language: string;
  content_template?: string;
  variables: TemplateVariable[];
  version: number;
  is_active: boolean;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  type: string;
  required: boolean;
}

export interface DashboardStatistics {
  total_new_hires: number;
  by_status: Record<string, number>;
  completion_rate: number;
  average_time_to_complete_hours: number;
  pending_questions: number;
  this_month: {
    new_hires_created: number;
    completed: number;
    declined: number;
  };
}

export interface AnalyticsOverview {
  time_period: { start_date: string; end_date: string };
  metrics: {
    total_new_hires: number;
    completed: number;
    in_progress: number;
    completion_rate: number;
    average_time_to_complete_hours: number;
    total_questions: number;
    questions_answered: number;
    average_response_time_hours: number;
  };
  trends: {
    new_hires_by_week: { week: string; count: number }[];
    completion_rate_by_week: { week: string; rate: number }[];
  };
}

export interface ConversationAnalytics {
  total_conversations: number;
  average_duration_seconds: number;
  completion_rate: number;
  average_sentiment: number;
  average_engagement: number;
  by_language: Record<string, number>;
  common_questions: { category: string; count: number; examples: string[] }[];
}

export interface Pagination {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// ─── Status helpers ────────────────────────────────────────────

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-800",
  invited: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  offer_presented: "bg-purple-100 text-purple-800",
  questions_pending: "bg-orange-100 text-orange-800",
  contract_sent: "bg-indigo-100 text-indigo-800",
  signed: "bg-emerald-100 text-emerald-800",
  completed: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  pending: "bg-yellow-100 text-yellow-800",
  answered: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
  in_review: "bg-purple-100 text-purple-800",
  escalated: "bg-red-100 text-red-800",
  generated: "bg-blue-100 text-blue-800",
  sent: "bg-indigo-100 text-indigo-800",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  invited: "Invited",
  in_progress: "In Progress",
  offer_presented: "Offer Presented",
  questions_pending: "Questions Pending",
  contract_sent: "Contract Sent",
  signed: "Signed",
  completed: "Completed",
  declined: "Declined",
  pending: "Pending",
  answered: "Answered",
  resolved: "Resolved",
  in_review: "In Review",
  escalated: "Escalated",
  generated: "Generated",
  sent: "Sent",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  normal: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export const CATEGORY_COLORS: Record<string, string> = {
  benefits: "bg-emerald-100 text-emerald-700",
  salary: "bg-amber-100 text-amber-700",
  policies: "bg-blue-100 text-blue-700",
  legal: "bg-purple-100 text-purple-700",
  relocation: "bg-cyan-100 text-cyan-700",
  team: "bg-pink-100 text-pink-700",
  growth: "bg-indigo-100 text-indigo-700",
};
