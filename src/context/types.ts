export interface Song {
  id: number;
  name: string;
  ar: { name: string }[];
  al: { picUrl: string };
  url?: string;
}

export interface PlaylistSong {
  id: number;
  name: string;
  ar: { name: string }[];
  al: { picUrl: string };
}

export interface Playlist {
  id: number;
  name: string;
  picUrl: string;
  playCount?: number;
  trackCount?: number;
  creator?: { nickname: string };
  songs?: PlaylistSong[];
}

export interface User {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  createdAt: number;
}

export interface DailySong {
  id: number;
  name: string;
  ar: { name: string }[];
  al: { picUrl: string };
  dt: number;
  url?: string;
}

export type AuthState = 'checking' | 'unauth' | 'authed';
export type NavView = 'discover' | 'library' | 'leaderboard' | 'playlists' | 'settings';
