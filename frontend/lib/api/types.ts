// Types mirroring the FastAPI response schemas (backend/schemas/*).

export type Option = "A" | "B" | "C" | "D";
export const OPTIONS: Option[] = ["A", "B", "C", "D"];

export interface Me {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  role: "student" | "admin";
  preferred_category: string | null;
  target_exam: "HAT" | "USAT" | null;
  daily_goal: number;
  created_at: string;
  is_super_admin: boolean;
}

export interface SectionSummary {
  code: string;
  name: string;
  mcq_count: number;
}

export interface CategoryBrief {
  id: number;
  code: string;
  name: string;
  description: string | null;
  disciplines: string[];
  mcq_duration_min: number;
  essay_duration_min: number | null;
  total_mcqs: number;
  sections: SectionSummary[];
}

export interface Exam {
  id: number;
  code: "HAT" | "USAT";
  name: string;
  description: string | null;
  categories: CategoryBrief[];
}

export interface TopicOut {
  id: number;
  name: string;
  available: number;
}

export interface SubjectOut {
  id: number;
  slug: string;
  name: string;
  mcq_count: number;
  available: number;
  topics: TopicOut[];
}

export interface SectionOut {
  id: number;
  code: string;
  name: string;
  mcq_count: number;
  available: number;
  subjects: SubjectOut[];
}

export interface CategoryOverview {
  exam: { id: number; code: string; name: string };
  category: {
    id: number;
    code: string;
    name: string;
    description: string | null;
    disciplines: string[];
    mcq_duration_min: number;
    essay_duration_min: number | null;
  };
  total_mcqs: number;
  total_available: number;
  sections: SectionOut[];
  mocks: { id: number; title: string; description: string | null; duration_min: number; question_count: number }[];
  essays: { argument: number; narrative: number; duration_min: number } | null;
}

export interface AttemptQuestion {
  position: number;
  section_id: number;
  subject_id: number;
  stem: string;
  image_url: string | null;
  options: Record<Option, string>;
  selected: Option | null;
  marked: boolean;
  seq: number;
  checked: boolean;
  correct: Option | null;
  explanation: string | null;
}

export interface Attempt {
  id: string;
  title: string;
  mode: "topic" | "subject" | "section" | "full_mock" | "essay";
  status: "in_progress" | "submitted";
  essay_status: string;
  category: { code: string; name: string; exam: string };
  started_at: string;
  deadline_at: string | null;
  server_now: string;
  sections: { id: number; name: string }[];
  subjects: { id: number; name: string }[];
  questions: AttemptQuestion[];
}

export interface CheckResult {
  position: number;
  selected: Option | null;
  correct: Option;
  is_correct: boolean;
  explanation: string | null;
  solution: string | null;
}

export interface Breakdown {
  id: number;
  name: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  score: number;
  max_score: number;
}

export interface EssayResult {
  essay_type: "argument" | "narrative";
  topic: string | null;
  word_count: number;
  status: string;
  score: number | null;
  max_score: number;
  feedback: string | null;
  content: string;
}

export interface Result {
  attempt_id: string;
  title: string;
  mode: string;
  category: { code: string; name: string; exam: string };
  started_at: string;
  submitted_at: string | null;
  score: number;
  total_marks: number;
  percentage: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  accuracy: number;
  time_used_sec: number;
  question_count: number;
  sections: Breakdown[];
  subjects: Breakdown[];
  essay_status: string;
  essay_score: number | null;
  essay_total: number | null;
  essays: EssayResult[];
}

export interface ReviewItem {
  position: number;
  section: string;
  subject: string;
  topic: string | null;
  stem: string;
  image_url: string | null;
  options: Record<Option, string>;
  selected: Option | null;
  correct: Option;
  is_correct: boolean | null;
  marked: boolean;
  explanation: string | null;
  solution: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface HistoryItem {
  id: string;
  title: string;
  mode: string;
  category_code: string;
  status: string;
  essay_status: string;
  started_at: string;
  submitted_at: string | null;
  score: number | null;
  total_marks: number | null;
  question_count: number;
}

export interface EssayState {
  attempt_id: string;
  title: string;
  mode: string;
  status: string;
  server_now: string;
  deadline_at: string | null;
  options: Record<"argument" | "narrative", { id: number; prompt: string }[]>;
  essays: {
    essay_type: "argument" | "narrative";
    topic_id: number | null;
    content: string;
    word_count: number;
    status: string;
    max_score: number;
    seq: number;
  }[];
}

// ---------------------------------------------------------------- progress

export interface SubjectStat {
  id: number;
  name: string;
  section: string;
  answered: number;
  correct: number;
  accuracy: number;
  seen: number;
  bank: number;
  coverage: number;
}

export type RecAction =
  | { type: "practice"; mode: "quiz" | "subject" | "section" | "mistakes"; ref_id: number | null; count: number }
  | { type: "link"; href: string };

export interface Overview {
  category: { code: string; name: string; exam: "HAT" | "USAT" };
  progress: { percent: number; seen: number; bank: number; answered: number; accuracy: number };
  streak: {
    current: number;
    best: number;
    active_today: boolean;
    last14: { date: string; count: number; active: boolean }[];
  };
  completed: { attempts: number; mocks: number; quizzes: number };
  scores: {
    recent: { id: string; title: string; mode: string; date: string; percent: number }[];
    average: number | null;
    best: number | null;
  };
  subjects: SubjectStat[];
  weak_subjects: SubjectStat[];
  strong_subjects: SubjectStat[];
  mistakes: { total: number; wrong: number };
  goals: { key: "daily" | "weekly" | "mock"; label: string; current: number; target: number }[];
  recommendations: { kind: string; title: string; body: string; action: RecAction }[];
  achievements: { key: string; title: string; description: string; earned: boolean }[];
}

export interface MistakeItem {
  question_id: number;
  subject: string;
  subject_id: number;
  kind: "wrong" | "skipped" | "flagged";
  flagged: boolean;
  difficulty: "easy" | "medium" | "hard";
  seen_at: string;
  stem: string;
  image_url: string | null;
  options: Record<Option, string>;
  selected: Option | null;
  correct: Option;
  explanation: string | null;
  solution: string | null;
}

export interface Mistakes extends Page<MistakeItem> {
  counts: { all: number; wrong: number; skipped: number; flagged: number };
  subjects: { id: number; name: string; count: number }[];
}
