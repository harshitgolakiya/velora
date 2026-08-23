export type CollectionAssignmentInput = {
  title: string;
  categoryName: string;
  tags?: string[];
};

export type KnownCollectionSlug = "pilates-studio" | "court-club" | "everyday-motion" | "training-core";

function textForAssignment(input: CollectionAssignmentInput) {
  return `${input.title} ${input.categoryName} ${(input.tags ?? []).join(" ")}`.toLowerCase();
}

export function suggestCollectionSlugsForProduct(input: CollectionAssignmentInput): KnownCollectionSlug[] {
  const text = textForAssignment(input);
  const suggestions = new Set<KnownCollectionSlug>();

  if (/\b(pilates|yoga|studio|flow|grip|soft)\b/.test(text)) {
    suggestions.add("pilates-studio");
  }

  if (/\b(tennis|court|racket|warm-up|cap)\b/.test(text)) {
    suggestions.add("court-club");
  }

  if (/\b(everyday|commute|transit|tote|casual|rib|wrap)\b/.test(text)) {
    suggestions.add("everyday-motion");
  }

  if (/\b(training|support|sculpt|legging|performance|workout|tempo)\b/.test(text)) {
    suggestions.add("training-core");
  }

  if (!suggestions.size) {
    suggestions.add("everyday-motion");
  }

  return Array.from(suggestions);
}
