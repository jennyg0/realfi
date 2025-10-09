export const FAQ_CORPUS: Record<string, { match: RegExp; answer: string }> = {
  emergencyFund: {
    match: /emergency fund/i,
    answer:
      "An emergency fund is a cash buffer that covers 3-6 months of essential expenses. It protects you from unexpected costs without going into debt.",
  },
  debtSnowball: {
    match: /debt (snowball|pay ?off)/i,
    answer:
      "The debt snowball approach means paying minimums on all debts, then focusing extra cash on the smallest balance first. Each payoff builds momentum.",
  },
  budgeting: {
    match: /(budget|50\/?30\/?20)/i,
    answer:
      "The 50/30/20 framework allocates ~50% of income to needs, 30% to wants, and 20% to savings or debt paydown. Adjust as your goals evolve.",
  },
};
