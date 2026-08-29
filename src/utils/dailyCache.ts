const cacheStore: Record<string, any> = {};

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function getDailyCache<T>(key: string): Promise<T | null> {
  // 1. 内存一级缓存 (0ms)
  if (cacheStore[key] !== undefined) {
    return cacheStore[key] as T;
  }

  // 2. localStorage 二级缓存 (0.1ms 瞬时直读，秒开)
  try {
    const localRaw = localStorage.getItem(`fm_daily_${key}`);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed && parsed.date === getTodayStr() && parsed.data !== undefined) {
        cacheStore[key] = parsed.data;
        return parsed.data as T;
      }
    }
  } catch {}

  // 3. 服务端磁盘三级缓存
  try {
    const res = await fetch(`/api/cache/${key}`);
    const json = await res.json();
    if (json.code === 200 && json.data !== null && json.data !== undefined) {
      cacheStore[key] = json.data;
      try {
        localStorage.setItem(`fm_daily_${key}`, JSON.stringify({ date: getTodayStr(), data: json.data }));
      } catch {}
      return json.data as T;
    }
  } catch {}

  return null;
}

export async function setDailyCache<T>(key: string, data: T): Promise<void> {
  cacheStore[key] = data;
  try {
    localStorage.setItem(`fm_daily_${key}`, JSON.stringify({ date: getTodayStr(), data }));
  } catch {}

  // 异步同步到后端磁盘（不阻塞前端）
  try {
    fetch(`/api/cache/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    }).catch(() => {});
  } catch {}
}
