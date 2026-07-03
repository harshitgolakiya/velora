type SearchClickInput = {
  query: string;
  source: "predictive" | "results_page";
  resultType: "product" | "category" | "collection" | "page";
  resultId?: string;
  href: string;
  position?: number;
};

export type StoredSearchAttribution = Pick<SearchClickInput, "query" | "source" | "resultType" | "resultId" | "href"> & {
  clickedAt: string;
};

const attributionKey = "velora:search-attribution";

export function getStoredSearchAttribution(): StoredSearchAttribution | undefined {
  try {
    const raw = window.localStorage.getItem(attributionKey);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<StoredSearchAttribution>;
    if (!parsed.query || !parsed.source || !parsed.clickedAt) return undefined;
    const clickedAt = new Date(parsed.clickedAt).getTime();
    if (!Number.isFinite(clickedAt) || Date.now() - clickedAt > 7 * 24 * 60 * 60_000) {
      window.localStorage.removeItem(attributionKey);
      return undefined;
    }
    return {
      query: parsed.query,
      source: parsed.source,
      resultType: parsed.resultType,
      resultId: parsed.resultId,
      href: parsed.href,
      clickedAt: parsed.clickedAt,
    } as StoredSearchAttribution;
  } catch {
    return undefined;
  }
}

export function clearStoredSearchAttribution() {
  try {
    window.localStorage.removeItem(attributionKey);
  } catch {
    // localStorage unavailable.
  }
}

export function trackSearchClick(input: SearchClickInput) {
  const query = input.query.trim();
  if (query.length < 2) return;

  try {
    window.localStorage.setItem(
      attributionKey,
      JSON.stringify({
        query,
        source: input.source,
        resultType: input.resultType,
        resultId: input.resultId,
        href: input.href,
        clickedAt: new Date().toISOString(),
      } satisfies StoredSearchAttribution),
    );
  } catch {
    // localStorage unavailable.
  }

  void fetch("/api/search/click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, query }),
    keepalive: true,
  }).catch(() => {
    // Analytics should never interrupt navigation.
  });
}
