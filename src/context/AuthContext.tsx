import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, AuthState } from './types';
import { getUserAccount, getUserPlaylist, logout as neteaseLogout, checkLoginStatus, getLocalPlaylists } from '../services/api';

interface UserPlaylist {
  id: number;
  name: string;
  picUrl: string;
  subscribed: boolean;
  trackCount: number;
  playCount: number;
  tracks?: any[];
}

interface AuthContextType {
  user: User | null;
  authState: AuthState;
  authError: string;
  subscribedPlaylists: UserPlaylist[];
  createdPlaylists: UserPlaylist[];
  qrLogin: () => Promise<void>;
  logout: () => void;
  fetchUserPlaylists: (uid: number) => Promise<void>;
  fetchLocalPlaylists: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [authError, setAuthError] = useState('');
  const [subscribedPlaylists, setSubscribedPlaylists] = useState<UserPlaylist[]>([]);
  const [createdPlaylists, setCreatedPlaylists] = useState<UserPlaylist[]>([]);

  const fetchUserPlaylists = useCallback(async (uid: number) => {
    try {
      const res = await getUserPlaylist(uid);
      const list = res.data.playlist;
      if (list?.length) {
        const mapped: UserPlaylist[] = list.map((item: Record<string, unknown>) => ({
          id: item.id as number,
          name: item.name as string,
          picUrl: item.coverImgUrl as string,
          subscribed: item.subscribed as boolean,
          trackCount: item.trackCount as number,
          playCount: item.playCount as number,
        }));
        setSubscribedPlaylists(mapped.length > 0 ? [mapped[0]] : []);
        setCreatedPlaylists(mapped.slice(1));
        try { localStorage.setItem(`user_playlists_${uid}`, JSON.stringify(mapped)); } catch {}
      }
    } catch {}
  }, []);

  const fetchUserInfo = useCallback(async () => {
    try {
      const res = await getUserAccount();
      const profile = res.data.profile;
      if (profile) {
        setUser({
          id: String(profile.userId),
          username: profile.nickname,
          nickname: profile.nickname,
          avatar: profile.avatarUrl || '',
          createdAt: Date.now(),
        });
        setAuthState('authed');

        const cachedStr = localStorage.getItem(`user_playlists_${profile.userId}`);
        const cached = cachedStr ? JSON.parse(cachedStr) as UserPlaylist[] : null;
        if (cached?.length) {
          setSubscribedPlaylists(cached.length > 0 ? [cached[0]] : []);
          setCreatedPlaylists(cached.slice(1));
        }
        fetchUserPlaylists(profile.userId);
        fetchLocalPlaylists();
        return true;
      }
    } catch {}
    return false;
  }, [fetchUserPlaylists]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await checkLoginStatus();
        if (cancelled) return;
        if (data.logged) {
          const ok = await fetchUserInfo();
          if (!cancelled && !ok) setAuthState('unauth');
        } else {
          setAuthState('unauth');
        }
      } catch {
        if (!cancelled) setAuthState('unauth');
      }
    })();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const qrLogin = useCallback(async () => {
    setAuthError('');
    try {
      const ok = await fetchUserInfo();
      if (!ok) throw new Error('获取用户信息失败');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '二维码登录失败';
      setAuthError(message);
      throw err;
    }
  }, [fetchUserInfo]);

  const fetchLocalPlaylists = useCallback(async () => {
    try {
      const uid = user?.id;
      if (!uid) return;
      const res = await getLocalPlaylists(uid);
      const data = res.data.data;
      if (data) {
        if (data.subscribed?.length) setSubscribedPlaylists(data.subscribed);
        if (data.created?.length) setCreatedPlaylists(data.created);
      }
    } catch {}
  }, [user]);

  const logout = useCallback(() => {
    neteaseLogout().catch(() => {});
    setUser(null);
    setSubscribedPlaylists([]);
    setCreatedPlaylists([]);
    setAuthState('unauth');
    setAuthError('');
    try {
      const uid = user?.id;
      if (uid) localStorage.removeItem(`user_playlists_${uid}`);
    } catch {}
  }, [user]);

  const value = {
    user, authState, authError, subscribedPlaylists, createdPlaylists,
    qrLogin, logout, fetchUserPlaylists, fetchLocalPlaylists,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
