export function splitProductCopy(description: string) {
  const productDetailsMarker = /\bProduct Details\b/i;
  const fabricCareMarker = /\bFabric\s*&\s*Care\b/i;
  const productDetailsMatch = productDetailsMarker.exec(description);
  const summary = productDetailsMatch
    ? description.slice(0, productDetailsMatch.index).trim()
    : description.trim();
  const remainder = productDetailsMatch
    ? description.slice(productDetailsMatch.index + productDetailsMatch[0].length).trim()
    : "";
  const fabricCareMatch = fabricCareMarker.exec(remainder);

  return {
    summary,
    productDetails: fabricCareMatch
      ? remainder.slice(0, fabricCareMatch.index).trim()
      : remainder,
    fabricCare: fabricCareMatch
      ? remainder.slice(fabricCareMatch.index + fabricCareMatch[0].length).trim()
      : "",
  };
}

export function isGenericProductCopy(value: string) {
  return /^(see garment label|follow the care instructions)/i.test(value.trim());
}
