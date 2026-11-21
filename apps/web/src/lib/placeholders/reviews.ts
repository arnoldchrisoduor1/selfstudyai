/** Design sample for review fields the API cannot return. */

export interface ReviewWeakSample {
  title: string;
  subject: string;
  body: string;
  lapses: string;
  lapseTone: "weak" | "review";
  stability: string;
  icon: string;
}

export const reviewsPlaceholder = {
  retention: "91.4%",
  retentionDelta: "+2.1% this month",
  retentionDetail: "On track for semester exam targets",
  stability: "18.4 Days",
  stabilityHint: "Half-life",
  stabilityDetail: "Average retention interval across deck",
  milestone: "Next milestone badge at 14 days",
  forecastTotal: 122,
  forecast: [28, 19, 12, 24, 15, 8, 16],
  flagged: 3,
  weak: [
    {
      title: "PBFT Quorum vs Paxos Quorum",
      subject: "Distributed Systems",
      body: "Distinguishing 3f+1 node total with 2f+1 quorum from simple crash-fault majority requirement.",
      lapses: "4 failures",
      lapseTone: "weak",
      stability: "2.4 days",
      icon: "psychology_alt",
    },
    {
      title: "Second-pole phase margin formula",
      subject: "Linear Electronics",
      body: "Calculating exact phase margin delta when dominant pole compensation shifts unity gain crossover frequency.",
      lapses: "3 failures",
      lapseTone: "review",
      stability: "3.8 days",
      icon: "functions",
    },
    {
      title: "Softmax gradient underflow condition",
      subject: "Machine Learning",
      body: "Why subtracting max(z) preserves numerical stability during exponential summation in fp16 precision.",
      lapses: "2 failures",
      lapseTone: "review",
      stability: "5.1 days",
      icon: "grain",
    },
  ] satisfies ReviewWeakSample[],
};
