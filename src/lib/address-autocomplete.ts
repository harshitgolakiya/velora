export type AddressSuggestion = {
  emirate: string;
  city: string;
  area: string;
  label: string;
};

const UAE_ADDRESS_SUGGESTIONS: AddressSuggestion[] = [
  { emirate: "Dubai", city: "Dubai", area: "Dubai Marina", label: "Dubai Marina, Dubai" },
  { emirate: "Dubai", city: "Dubai", area: "Downtown Dubai", label: "Downtown Dubai, Dubai" },
  { emirate: "Dubai", city: "Dubai", area: "Business Bay", label: "Business Bay, Dubai" },
  { emirate: "Dubai", city: "Dubai", area: "Jumeirah Village Circle", label: "Jumeirah Village Circle, Dubai" },
  { emirate: "Dubai", city: "Dubai", area: "Palm Jumeirah", label: "Palm Jumeirah, Dubai" },
  { emirate: "Abu Dhabi", city: "Abu Dhabi", area: "Al Reem Island", label: "Al Reem Island, Abu Dhabi" },
  { emirate: "Abu Dhabi", city: "Abu Dhabi", area: "Yas Island", label: "Yas Island, Abu Dhabi" },
  { emirate: "Abu Dhabi", city: "Abu Dhabi", area: "Saadiyat Island", label: "Saadiyat Island, Abu Dhabi" },
  { emirate: "Sharjah", city: "Sharjah", area: "Al Majaz", label: "Al Majaz, Sharjah" },
  { emirate: "Sharjah", city: "Sharjah", area: "Al Nahda", label: "Al Nahda, Sharjah" },
  { emirate: "Ajman", city: "Ajman", area: "Al Rashidiya", label: "Al Rashidiya, Ajman" },
  { emirate: "Ras Al Khaimah", city: "Ras Al Khaimah", area: "Al Hamra Village", label: "Al Hamra Village, Ras Al Khaimah" },
  { emirate: "Fujairah", city: "Fujairah", area: "Fujairah City", label: "Fujairah City, Fujairah" },
  { emirate: "Umm Al Quwain", city: "Umm Al Quwain", area: "Al Salamah", label: "Al Salamah, Umm Al Quwain" },
];

export function getAddressSuggestions(emirate?: string) {
  return emirate
    ? UAE_ADDRESS_SUGGESTIONS.filter((suggestion) => suggestion.emirate === emirate)
    : UAE_ADDRESS_SUGGESTIONS;
}

export function findAddressSuggestion(label: string) {
  const normalized = label.trim().toLowerCase();
  return UAE_ADDRESS_SUGGESTIONS.find(
    (suggestion) => suggestion.label.toLowerCase() === normalized,
  );
}
