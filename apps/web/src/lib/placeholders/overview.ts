/** Design sample for overview fields the API cannot return. */

export type OverviewDot = "primary" | "secondary" | "review";

export interface OverviewSubjectSample {
  name: string;
  tag: string;
  tagTone: "primary" | "neutral";
  dot: OverviewDot;
  chapter: string;
  completion: number;
  flashcards: string;
  notes: string;
  studied: string;
  bar: OverviewDot;
}

export interface OverviewQueueSample {
  name: string;
  stability: string;
  overdue?: string;
  count: number;
  dot: OverviewDot;
}

export interface OverviewActivitySample {
  icon: string;
  iconTone: "primary" | "review" | "stable";
  title: string;
  when: string;
  detail: string;
  emphasis?: string;
}

export interface OverviewWeakSample {
  title: string;
  subject: string;
  accuracy: string;
  tone: "weak" | "review";
}

export interface OverviewPlaceholder {
  name: string;
  scheduledSubjects: number;
  knowledgeScore: number;
  knowledgeScale: number;
  knowledgeDelta: string;
  estimatedMinutes: string;
  mastered: string;
  masteredDelta: string;
  masteredStability: string;
  goldCount: number;
  goldDelta: string;
  burstTitle: string;
  burstBody: string;
  burstLabel: string;
  burstNote: string;
  queue: OverviewQueueSample[];
  upcomingTitle: string;
  upcomingWhen: string;
  upcomingReadiness: number;
  upcomingTarget: string;
  chartMastered: string;
  retention: number[];
  subjects: OverviewSubjectSample[];
  activity: OverviewActivitySample[];
  weak: OverviewWeakSample[];
}

export const overviewPlaceholder: OverviewPlaceholder = {
  name: "Arnold",
  scheduledSubjects: 3,
  knowledgeScore: 884,
  knowledgeScale: 1000,
  knowledgeDelta: "+18 pts vs last week",
  estimatedMinutes: "Est. 14 mins completion",
  mastered: "1,420",
  masteredDelta: "+34 this week",
  masteredStability: "84% long-term stability",
  goldCount: 18,
  goldDelta: "+2 this week",
  burstTitle: "Consensus & Leader election",
  burstBody: "High-impact retrieval practice on Raft log replication invariant checks.",
  burstLabel: "Start burst (4 questions)",
  burstNote: "Earn 2x streak multiplier points",
  queue: [
    {
      name: "Distributed Systems",
      stability: "Avg. stability 3.2d",
      overdue: "8 overdue",
      count: 14,
      dot: "primary",
    },
    {
      name: "Linear Electronics",
      stability: "Avg. stability 5.8d",
      count: 9,
      dot: "secondary",
    },
    {
      name: "Machine Learning",
      stability: "Avg. stability 12.1d",
      count: 5,
      dot: "review",
    },
  ],
  upcomingTitle: "Distributed Systems Final",
  upcomingWhen: "in 9 days · Nov 29",
  upcomingReadiness: 68,
  upcomingTarget: "Target readiness: 85%",
  chartMastered: "42 cards mastered",
  retention: [88, 90, 89, 91, 90, 91, 91],
  subjects: [
    {
      name: "Distributed Systems",
      tag: "Core CS",
      tagTone: "primary",
      dot: "primary",
      chapter: "Ch. 4: Consensus & Raft Protocol",
      completion: 72,
      flashcards: "48 / 65 flashcards",
      notes: "4 notes",
      studied: "Studied today at 08:30 AM",
      bar: "primary",
    },
    {
      name: "Linear Electronics",
      tag: "Hardware",
      tagTone: "neutral",
      dot: "secondary",
      chapter: "Op-Amp Configurations & Frequency Response",
      completion: 48,
      flashcards: "32 / 60 flashcards",
      notes: "2 lecture PDFs",
      studied: "Studied yesterday (Nov 19, 2026)",
      bar: "secondary",
    },
    {
      name: "Machine Learning",
      tag: "Deep Learning",
      tagTone: "neutral",
      dot: "review",
      chapter: "Transformers & Multi-Head Attention Mechanisms",
      completion: 91,
      flashcards: "84 / 92 flashcards",
      notes: "1 research paper",
      studied: "Studied Nov 18, 2026",
      bar: "review",
    },
  ],
  activity: [
    {
      icon: "upload",
      iconTone: "primary",
      title: "MIT_6.824_Raft_Lecture_Notes.pdf",
      when: "Nov 20 · 2h ago",
      detail: "Extracted concepts & auto-generated",
      emphasis: "24 new flashcards",
    },
    {
      icon: "quiz",
      iconTone: "stable",
      title: "Op-Amp Slew Rate & Frequency Response",
      when: "Nov 19 · 4h ago",
      detail: "Quiz completed · Score:",
      emphasis: "92%",
    },
    {
      icon: "star",
      iconTone: "review",
      title: "Nyquist Stability Criterion",
      when: "Nov 19",
      detail: "Gold question mastered: Nyquist Stability Criterion",
    },
    {
      icon: "history",
      iconTone: "primary",
      title: "Spaced Repetition Review (18 items)",
      when: "Nov 18",
      detail: "100% on target recall · Mean response latency 4.2s.",
    },
  ],
  weak: [
    {
      title: "Byzantine Fault Tolerance (BFT)",
      subject: "Distributed Systems",
      accuracy: "54% Accuracy (Weak)",
      tone: "weak",
    },
    {
      title: "Phase Margin & Gain Margin Bode plots",
      subject: "Linear Electronics",
      accuracy: "61% Accuracy (Needs review)",
      tone: "review",
    },
    {
      title: "Cross-Entropy Loss in Multi-Class Classification",
      subject: "Machine Learning",
      accuracy: "68% Accuracy (Needs review)",
      tone: "review",
    },
  ],
};
