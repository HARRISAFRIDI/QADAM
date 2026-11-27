// Static mirror of the official structure (seeded in backend/scripts/seed.py).
// Used only by public marketing pages so they stay fully static (no API call).

export const HAT = {
  code: "HAT",
  name: "Higher Education Aptitude Test",
  summary: "100 MCQs · 120 minutes · English, Analytical, Quantitative",
  categories: [
    { code: "HAT-I", disciplines: "Engineering & Technology, Computer Science, Mathematics, Statistics, Physics", split: [30, 30, 40] },
    { code: "HAT-II", disciplines: "Management Sciences, Business Education", split: [30, 40, 30] },
    { code: "HAT-III", disciplines: "Arts & Humanities, Social Sciences, Psychology, Law", split: [40, 35, 25] },
    { code: "HAT-IV", disciplines: "Agriculture & Veterinary, Biological & Medical, Physical Sciences, Education, Media", split: [40, 30, 30] },
    { code: "HAT-General", disciplines: "Religious Studies (Madrassa graduates)", split: [40, 30, 30] },
  ],
};

export const USAT = {
  code: "USAT",
  name: "Undergraduate Studies Admission Test",
  summary: "75 MCQs · 100 minutes + 2 essays · 40 minutes",
  categories: [
    { code: "USAT-E", subjects: "Physics 10 · Chemistry 10 · Mathematics 10" },
    { code: "USAT-M", subjects: "Physics 8 · Chemistry 8 · Biology 14" },
    { code: "USAT-CS", subjects: "Physics 8 · Computer Science 14 · Mathematics 8" },
    { code: "USAT-GS", subjects: "Mathematics 10 · Statistics 10 · Economics 10" },
    { code: "USAT-COM", subjects: "Accounting 10 · Commerce 10 · Economics 10" },
    { code: "USAT-A", subjects: "Islamiat/Ethics 10 · Pakistan Studies 10 · General Knowledge 10" },
  ],
};
