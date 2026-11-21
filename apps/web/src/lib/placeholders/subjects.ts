/** Design sample for subject fields the API cannot return. */

export type SubjectTone = "strong" | "stable" | "review" | "neutral";
export type SubjectBar = "primary" | "secondary" | "review";

export interface SubjectModuleSample {
  title: string;
  score: string;
  tone: SubjectTone;
}

export interface SubjectCardSample {
  category: string;
  mastery: number;
  bar: SubjectBar;
  cardsLabel: string;
  notesLabel: string;
  modules: SubjectModuleSample[];
  moduleCount: number;
  minutes: string;
}

export interface SubjectsPlaceholder {
  mastery: number;
  masteryDelta: string;
  masteryDetail: string;
  masteryTarget: string;
  vaultCards: number;
  vaultDocs: number;
  vaultQuizzes: number;
  urgentDue: number;
  urgentSubject: string;
  urgentSubjectDue: number;
  urgentMinutes: string;
  goldCount: number;
  goldRate: string;
  categories: { id: string; label: string; count: number }[];
  cards: SubjectCardSample[];
}

export const subjectsPlaceholder: SubjectsPlaceholder = {
  mastery: 74,
  masteryDelta: "+6% this month",
  masteryDetail: "Curriculum average target 85%",
  masteryTarget: "74%",
  vaultCards: 164,
  vaultDocs: 7,
  vaultQuizzes: 14,
  urgentDue: 28,
  urgentSubject: "Distributed Systems",
  urgentSubjectDue: 14,
  urgentMinutes: "14 mins completion",
  goldCount: 18,
  goldRate: "98.2%",
  categories: [
    { id: "core", label: "Core Engineering", count: 2 },
    { id: "hardware", label: "Hardware & Circuits", count: 1 },
    { id: "archived", label: "Archived", count: 1 },
  ],
  cards: [
    {
      category: "Core CS · Advanced",
      mastery: 72,
      bar: "primary",
      cardsLabel: "48 of 65 cards",
      notesLabel: "4 notes",
      moduleCount: 6,
      minutes: "~7 min",
      modules: [
        { title: "Consensus & Raft Protocol", score: "88% Strong", tone: "strong" },
        { title: "Vector Clocks & Causality", score: "74% Stable", tone: "stable" },
        { title: "Byzantine Fault Tolerance", score: "54% Review", tone: "review" },
      ],
    },
    {
      category: "Hardware · Intermediate",
      mastery: 48,
      bar: "secondary",
      cardsLabel: "32 of 60 cards",
      notesLabel: "2 lecture PDFs",
      moduleCount: 5,
      minutes: "~5 min",
      modules: [
        { title: "Op-Amp & Frequency Response", score: "61% Stable", tone: "stable" },
        { title: "Phase Margin & Bode Plots", score: "42% Review", tone: "review" },
        { title: "Active Filter Synthesis", score: "40% Learn", tone: "neutral" },
      ],
    },
    {
      category: "Deep Learning · Advanced",
      mastery: 91,
      bar: "review",
      cardsLabel: "84 of 92 cards",
      notesLabel: "1 research paper",
      moduleCount: 5,
      minutes: "~3 min",
      modules: [
        { title: "Multi-Head Attention", score: "96% Strong", tone: "strong" },
        { title: "Diffusion & Generative Models", score: "89% Strong", tone: "strong" },
        { title: "Loss Calibration & Regularization", score: "68% Stable", tone: "stable" },
      ],
    },
  ],
};
