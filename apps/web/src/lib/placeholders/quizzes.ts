/** Design sample for quiz fields the API cannot return. */

export interface QuizResultSample {
  title: string;
  subject: string;
  when: string;
  questions: string;
  time: string;
  score: string;
  tone: "strong" | "stable" | "review" | "weak";
  concept: string;
}

export const quizzesPlaceholder = {
  retention: "99% retention",
  readiness: "88%",
  readinessBadge: "Final in 9 days",
  readinessDetail: "Predicted readiness · Distributed Systems on track",
  bannerTitle: "Machine Learning quiz, 6 of 10 answered",
  bannerPercent: 60,
  estimateNote: "Customize",
  application: "Application questions: 30% (0–50% range)",
  readyLabel: "3 quizzes ready for practice",
  scores: ["72% (Needs practice)", "61% (Needs review)", "94% (Strong)"],
  weak: [
    ["Log Compaction & Snapshot installation", "Leader Election split-votes during delays"],
    ["Gain-Bandwidth Product & Slew Rate limits", "Second-pole phase margin stability"],
    ["FlashAttention IO complexity & tiling", "Softmax scaling & vanishing gradients"],
  ],
  filters: ["All (42)", "Passed (38)", "Needs Retry (4)", "Simulations (6)"],
  showing: "Showing 4 of 42 recorded assessments",
  page: "Page 1 of 11",
  results: [
    {
      title: "Byzantine Fault Tolerance & PBFT Quorums",
      subject: "Distributed Systems · Core Quizzes",
      when: "Today, 10:15 AM",
      questions: "15 questions",
      time: "14m 20s (57s/q)",
      score: "92% Excellent",
      tone: "strong",
      concept: "Quorum calc (3f+1)",
    },
    {
      title: "BJT Small-Signal Hybrid-Pi Modeling",
      subject: "Linear Electronics · Midterm Practice",
      when: "Yesterday, 4:40 PM",
      questions: "20 questions",
      time: "22m 10s (66s/q)",
      score: "84% Good",
      tone: "stable",
      concept: "Early Voltage (V_A)",
    },
    {
      title: "Diffusion Probabilistic Models & DDPM Schedulers",
      subject: "Machine Learning · Topic Practice",
      when: "2 days ago",
      questions: "10 questions",
      time: "8m 45s (52s/q)",
      score: "58% Needs Attention",
      tone: "weak",
      concept: "ELBO derivation",
    },
    {
      title: "Two-Phase Commit vs Raft Log Replication",
      subject: "Distributed Systems · Core Quizzes",
      when: "4 days ago",
      questions: "12 questions",
      time: "11m 15s (56s/q)",
      score: "91% Excellent",
      tone: "strong",
      concept: "Coordinator failure",
    },
  ] satisfies QuizResultSample[],
};
