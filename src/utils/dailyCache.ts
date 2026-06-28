const cacheStore: Record<string, any> = {};

export async function getDailyCache<T>(key: string): Promise<T | null> {
  if (cacheStore[key] !== undefined) return cacheStore[key] as T;
  try {
    const res = await fetch(`/api/cache/${key}`);
    const json = await res.json();
    if (json.code === 200 && json.data !== null) {
      cacheStore[key] = json.data;
      return json.data as T;
    }
  } catch {}
  return null;
}

export async function setDailyCache<T>(key: string, data: T): Promise<void> {
  cacheStore[key] = data;
  try {
    await fetch(`/api/cache/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });
  } catch {}
}
