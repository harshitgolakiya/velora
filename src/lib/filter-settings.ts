export const filterGroupIds = ["sort", "gender", "size", "type", "style", "color", "collection", "material"] as const;

export type FilterGroupId = (typeof filterGroupIds)[number];

export type FilterSettings = {
  hiddenGroups: FilterGroupId[];
  groupOrder: FilterGroupId[];
};

export const defaultFilterSettings: FilterSettings = {
  hiddenGroups: [],
  groupOrder: [...filterGroupIds],
};

export const filterGroupLabels: Record<FilterGroupId, string> = {
  sort: "Sort",
  gender: "Gender",
  size: "Size",
  type: "Type",
  style: "Style",
  color: "Color",
  collection: "Collection",
  material: "Material",
};

function isFilterGroupId(value: unknown): value is FilterGroupId {
  return typeof value === "string" && filterGroupIds.includes(value as FilterGroupId);
}

function uniqueFilterGroups(values: unknown) {
  if (!Array.isArray(values)) return [];
  return Array.from(new Set(values.filter(isFilterGroupId)));
}

export function normalizeFilterSettings(input: unknown): FilterSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) return defaultFilterSettings;
  const row = input as Record<string, unknown>;
  const hiddenGroups = uniqueFilterGroups(row.hiddenGroups);
  const explicitOrder = uniqueFilterGroups(row.groupOrder);
  const groupOrder = [...explicitOrder, ...filterGroupIds.filter((group) => !explicitOrder.includes(group))];

  return {
    hiddenGroups,
    groupOrder,
  };
}

export function parseFilterSettings(value: string | null | undefined): FilterSettings {
  if (!value) return defaultFilterSettings;
  try {
    return normalizeFilterSettings(JSON.parse(value));
  } catch {
    return defaultFilterSettings;
  }
}
