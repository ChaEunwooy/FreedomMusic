import axios from 'axios';

const API = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// 推荐
export const getRecommendPlaylists = (limit = 6) => API.get(`/personalized?limit=${limit}`);
export const getHotPlaylists = (limit = 10, offset = 0) => API.get(`/top/playlist?limit=${limit}&offset=${offset}&order=hot`);
export const getTopPlaylist = (cat: string, limit = 6, offset = 0) => API.get(`/top/playlist?cat=${encodeURIComponent(cat)}&limit=${limit}&offset=${offset}`);
export const getDailyRecommend = () => API.get('/recommend/resource');

// 歌单
export const getPlaylistDetail = (id: number) => API.get(`/playlist/detail?id=${id}`);
export const getPlaylistTrackAll = (id: number, limit = 100, offset = 0) => API.get(`/playlist/track/all?id=${id}&limit=${limit}&offset=${offset}`);
export const addTrackToPlaylist = (pid: number, trackIds: number[]) =>
  API.post('/playlist/tracks', { op: 'add', pid, tracks: trackIds.join(',') });

// 歌曲
export const getSongUrl = (id: number | number[] | string) => {
  const ids = Array.isArray(id) ? id.join(',') : id;
  return API.get(`/song/url?id=${ids}`);
};
export const getSongDetail = (ids: number[]) => API.get(`/song/detail?ids=${ids.join(',')}`);
export const getLyric = (id: number) => API.get(`/lyric?id=${id}`);
export const likeSong = (id: number, like = true) => API.get(`/like?id=${id}&like=${like}`);

// 搜索
export const search = (keywords: string, type = 1, limit = 30) =>
  API.get(`/search?keywords=${encodeURIComponent(keywords)}&type=${type}&limit=${limit}`);

// 排行榜
export const getToplist = () => API.get('/toplist');
export const getTopSongs = (type = 0) => API.get(`/top/song?type=${type}`);

// 艺术家
export const getArtistList = (cat = 100, limit = 30) => API.get(`/artist/list?cat=${cat}&limit=${limit}`);
export const getArtistDetail = (id: number) => API.get(`/artists?id=${id}`);
export const getArtistTopSong = (id: number) => API.get(`/artist/top/song?id=${id}`);
export const getNewAlbums = (limit = 30) => API.get(`/album/new?limit=${limit}`);
export const getHotAlbums = (limit = 30) => API.get(`/top/album?limit=${limit}`);
export const getAlbumDetail = (id: number) => API.get(`/album?id=${id}`);

// 评论
export const getComments = (id: number, type = 0, limit = 20) => API.get(`/comment/${type === 0 ? 'music' : 'playlist'}?id=${id}&limit=${limit}`);

// 用户
export const getUserAccount = () => API.get('/user/account');
export const getUserPlaylist = (uid: number) => API.get(`/user/playlist?uid=${uid}`);

// 登录
export const getLoginQrKey = () => API.get('/login/qr/key?type=3');
export const createLoginQr = (key: string) => API.get(`/login/qr/create?key=${key}&qrimg=true`);
export const checkLoginQr = (key: string) => API.get(`/login/qr/check?key=${key}&type=3`);
export const checkLoginStatus = () => API.get('/login/status');
export const logout = () => API.get('/logout');

// 本地歌单管理
export const getLocalPlaylists = (uid: string) => API.get(`/local/playlists?uid=${uid}`);
export const createLocalPlaylist = (uid: string, name: string, description?: string) =>
  API.post('/local/playlists/create', { uid, name, description });
export const deleteLocalPlaylist = (uid: string, playlistId: number) =>
  API.post('/local/playlists/delete', { uid, playlistId });
export const addTracksToLocalPlaylist = (uid: string, playlistId: number, tracks: any[]) =>
  API.post('/local/playlists/add-tracks', { uid, playlistId, tracks });
export const removeTracksFromLocalPlaylist = (uid: string, playlistId: number, trackIds: number[]) =>
  API.post('/local/playlists/remove-tracks', { uid, playlistId, trackIds });
