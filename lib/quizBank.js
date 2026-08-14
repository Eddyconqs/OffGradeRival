// A small mixed-subject question bank. In-app quizzes are how
// GradeRival awards XP for active recall between real assignments.
export const QUIZ_BANK = [
  {
    q: "You score 42/50 on a test. What's that as a percentage?",
    options: ["78%", "82%", "84%", "88%"],
    answer: 2,
  },
  {
    q: "A class is weighted 50% tests, 30% quizzes, 20% homework. You have a 90 test average, 80 quiz average, and haven't turned in homework yet. What's your current grade?",
    options: [
      "86.25%, homework excluded from the weighting",
      "80% flat",
      "56.25%, homework counted as zero",
      "90%, only the highest category counts",
    ],
    answer: 0,
  },
  {
    q: "Which derivative rule applies to d/dx[sin(x) · x²]?",
    options: ["Chain rule", "Product rule", "Quotient rule", "Power rule alone"],
    answer: 1,
  },
  {
    q: "In 'The Great Gatsby', who narrates the novel?",
    options: ["Jay Gatsby", "Daisy Buchanan", "Nick Carraway", "Tom Buchanan"],
    answer: 2,
  },
  {
    q: "A 4.0 GPA scale typically assigns how many points to a B+?",
    options: ["3.0", "3.3", "3.7", "2.7"],
    answer: 1,
  },
  {
    q: "What's generally the most effective spaced-repetition interval after first learning something?",
    options: [
      "Review once and never again",
      "Cram the night before the test only",
      "Review at increasing intervals (1 day, 3 days, 1 week...)",
      "Review every hour for one day only",
    ],
    answer: 2,
  },
  {
    q: "Which best describes a 'what-if' grade scenario?",
    options: [
      "Deleting old assignments",
      "Simulating a hypothetical future score without saving it",
      "Changing a teacher's grading policy",
      "Averaging two different classes together",
    ],
    answer: 1,
  },
  {
    q: "Mitochondria are best described as the cell's:",
    options: ["Storage unit", "Powerhouse", "Genetic library", "Waste filter"],
    answer: 1,
  },
  {
    q: "If your GPA is credit-weighted, a 4-credit A matters ___ a 3-credit A.",
    options: ["less than", "the same as", "more than", "it cancels out"],
    answer: 2,
  },
  {
    q: "What's a low-effort, high-value habit for raising a borderline grade fast?",
    options: [
      "Ignore the lowest-weighted category",
      "Ask the teacher about extra credit or retakes on the highest-weighted category",
      "Only study the subjects you already like",
      "Skip review sessions with your study group",
    ],
    answer: 1,
  },
];

export function pickQuiz(count = 5) {
  const shuffled = [...QUIZ_BANK].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
