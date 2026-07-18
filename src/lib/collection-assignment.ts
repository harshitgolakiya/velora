export type CollectionAssignmentInput = {
  title: string;
  categoryName: string;
  tags?: string[];
};

export type KnownCollectionSlug = "studio-sculpt" | "desert-run" | "after-hours";

function textForAssignment(input: CollectionAssignmentInput) {
  return `${input.title} ${input.categoryName} ${(input.tags ?? []).join(" ")}`.toLowerCase();
}

export function suggestCollectionSlugsForProduct(input: CollectionAssignmentInput): KnownCollectionSlug[] {
  const text = textForAssignment(input);
  const suggestions = new Set<KnownCollectionSlug>();

  if (/\b(leggings?|pants|bras?|contour|define|flared|sculpt|compression)\b/.test(text)) {
    suggestions.add("studio-sculpt");
  }

  if (/\b(jacket|track|bottle|tumbler|run|outdoor|hydration)\b/.test(text)) {
    suggestions.add("desert-run");
  }

  if (/\b(top|crop|wrap|rib|soft|after|lounge|wide leg)\b/.test(text)) {
    suggestions.add("after-hours");
  }

  if (!suggestions.size) {
    suggestions.add("studio-sculpt");
  }

  return Array.from(suggestions);
}
