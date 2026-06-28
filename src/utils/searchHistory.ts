const SEARCH_HISTORY_KEY = 'freedom_search_history';
const MAX_HISTORY = 20;

export function getSearchHistory(): string[] {
  try {
    const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addSearchHistory(query: string): void {
  const history = getSearchHistory();
  const filtered = history.filter((h) => h !== query);
  filtered.unshift(query);
  if (filtered.length > MAX_HISTORY) {
    filtered.length = MAX_HISTORY;
  }
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
  } catch {}
}

export function removeSearchHistory(query: string): void {
  const history = getSearchHistory();
  const filtered = history.filter((h) => h !== query);
  try {
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(filtered));
  } catch {}
}

export function clearSearchHistory(): void {
  try {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {}
}
