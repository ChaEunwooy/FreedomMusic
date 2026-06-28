const NETEASE_COOKIE_KEY = 'netease_cookie';

// 只保留真正需要的 cookie 字段，过滤掉冗余内容
const ESSENTIAL_KEYS = new Set([
  'MUSIC_U',     // 登录凭证（核心）
  '__csrf',      // CSRF token
  'NMTID',       // 设备指纹
  'os',          // 平台标识
  'osver',       // 系统版本
  'appver',      // 应用版本
  'deviceId',    // 设备ID
  'channel',     // 渠道
]);

export function getStoredCookie(): string {
  try {
    return localStorage.getItem(NETEASE_COOKIE_KEY) || '';
  } catch {
    return '';
  }
}

// 解析 cookie 字符串为键值对对象
function parseCookiePairs(cookieStr: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!cookieStr) return map;
  cookieStr.split(/;\s*/).forEach((pair) => {
    const [name, ...rest] = pair.split('=');
    if (name && rest.length > 0) {
      const key = name.trim();
      const value = rest.join('=').trim(); // value 本身可能含等号
      if (key && value && ESSENTIAL_KEYS.has(key)) {
        map[key] = `${key}=${value}`;
      }
    }
  });
  return map;
}

export function saveNeteaseCookie(cookie: string): void {
  try {
    const map = parseCookiePairs(cookie);
    const merged = Object.values(map).join('; ');
    localStorage.setItem(NETEASE_COOKIE_KEY, merged);
  } catch {
    // localStorage 配额已满
  }
}

export function mergeCookie(newCookieStr: string | null): void {
  if (!newCookieStr) return;

  const existingMap = parseCookiePairs(getStoredCookie());
  const newMap = parseCookiePairs(newCookieStr);

  // 合并：新值覆盖旧值
  Object.entries(newMap).forEach(([key, fullPair]) => {
    existingMap[key] = fullPair;
  });

  try {
    const merged = Object.values(existingMap).join('; ');
    localStorage.setItem(NETEASE_COOKIE_KEY, merged);
  } catch {
    // localStorage 配额已满
  }
}

export function clearAuth(): void {
  try {
    localStorage.removeItem(NETEASE_COOKIE_KEY);
  } catch { /* ignore */ }
}

// 保持向后兼容：原来的签名
export function isGuestAccepted(): boolean {
  return false; // guest 模式已删除
}

export function acceptGuest(): void {
  // 空实现，兼容旧代码
}
