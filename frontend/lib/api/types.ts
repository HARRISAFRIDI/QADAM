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
  created_at: string;
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
