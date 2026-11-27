export interface Taxonomy {
  exams: { id: number; code: string; name: string }[];
  categories: {
    id: number;
    exam_id: number;
    code: string;
    name: string;
    description: string | null;
    disciplines: string[];
    mcq_duration_min: number;
    essay_duration_min: number | null;
    is_active: boolean;
  }[];
  sections: { id: number; exam_id: number; code: string; name: string; kind: string; sort_order: number }[];
  subjects: { id: number; slug: string; name: string }[];
  topics: { id: number; subject_id: number; name: string; is_active: boolean; sort_order: number }[];
  blueprints: { id: number; category_id: number; section_id: number; subject_id: number; mcq_count: number }[];
}

export interface AdminQuestion {
  id: number;
  exam_id: number;
  subject_id: number;
  topic_id: number | null;
  stem: string;
  image_url: string | null;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
  explanation: string | null;
  solution: string | null;
  difficulty: "easy" | "medium" | "hard";
  marks: number;
  status: "draft" | "published" | "archived";
  source: string | null;
  import_batch: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface QuestionRow {
  id: number;
  exam: string;
  subject: string;
  topic: string | null;
  stem: string;
  correct_option: string;
  difficulty: string;
  status: string;
  import_batch: string | null;
  updated_at: string;
}

/** Subjects actually used by an exam (via its categories' blueprints). */
export function subjectsForExam(t: Taxonomy, examId: number) {
  const catIds = new Set(t.categories.filter((c) => c.exam_id === examId).map((c) => c.id));
  const ids = new Set(t.blueprints.filter((b) => catIds.has(b.category_id)).map((b) => b.subject_id));
  return t.subjects.filter((s) => ids.has(s.id));
}
