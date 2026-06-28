import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faPlay, faMusic, faClock, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { search, getSongUrl, getSongDetail } from '../../services/api';
import { formatDuration, formatCount } from '../../utils/format';
import { usePlayer } from '../../context/PlayerContext';
import SongMenu from '../../components/SongMenu';

const TABS = [
  { key: 1014, label: '综合' },
  { key: 1, label: '单曲' },
  { key: 1000, label: '歌单' },
  { key: 10, label: '专辑' },
  { key: 100, label: '歌手' },
] as const;

const SearchPage: FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  const [tab, setTab] = useState<number>(1);
  const [songs, setSongs] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const { play, currentSong } = usePlayer();
  const abortRef = useRef(0);

  useEffect(() => {
    if (!query) { setSongs([]); setPlaylists([]); setAlbums([]); setArtists([]); return; }
    const reqId = ++abortRef.current;
    setLoading(true);

    const fetchAll = async () => {
      if (tab === 1014) {
        const [songsRes, playlistsRes, artistsRes, albumsRes] = await Promise.all([
          search(query, 1, 6),
          search(query, 1000, 8),
          search(query, 100, 8),
          search(query, 10, 8),
        ]);
        if (reqId !== abortRef.current) return;
        const rawSongs = songsRes.data.result?.songs || songsRes.data.songs || [];
        setPlaylists(playlistsRes.data.result?.playlists || playlistsRes.data.playlists || []);
        setAlbums(albumsRes.data.result?.albums || albumsRes.data.albums || []);
        setArtists(artistsRes.data.result?.artists || artistsRes.data.artists || []);
        if (rawSongs.length > 0) {
          const ids = rawSongs.map((s: any) => s.id);
          const detailRes = await getSongDetail(ids);
          if (reqId !== abortRef.current) return;
          const detailMap = new Map<number, any>();
          (detailRes.data.songs || []).forEach((s: any) => detailMap.set(s.id, s));
          setSongs(rawSongs.map((s: any) => {
            const detail = detailMap.get(s.id);
            return { ...s, ar: detail?.ar || s.artists, al: detail?.al || s.album || {}, dt: detail?.dt || s.duration };
          }));
        } else {
          setSongs([]);
        }
      } else {
        const res = await search(query, tab, 30);
        if (reqId !== abortRef.current) return;
        const r = res.data.result || res.data;
        const rawSongs = r.songs || r.song?.songs || [];
        setPlaylists(r.playlists || []);
        setAlbums(r.albums || []);
        setArtists(r.artists || []);
        if (rawSongs.length > 0) {
          const ids = rawSongs.map((s: any) => s.id);
          const detailRes = await getSongDetail(ids);
          if (reqId !== abortRef.current) return;
          const detailMap = new Map<number, any>();
          (detailRes.data.songs || []).forEach((s: any) => detailMap.set(s.id, s));
          setSongs(rawSongs.map((s: any) => {
            const detail = detailMap.get(s.id);
            return { ...s, ar: detail?.ar || s.artists, al: detail?.al || s.album || {}, dt: detail?.dt || s.duration };
          }));
        } else {
          setSongs([]);
        }
      }
      setLoading(false);
    };
    fetchAll().catch(() => { if (reqId === abortRef.current) setLoading(false); });
  }, [query, tab]);

  const playSong = async (song: any) => {
    try {
      const res = await getSongUrl(song.id);
      const urlData = res.data.data?.[0];
      if (!urlData?.url) return;
      play({ id: song.id, name: song.name, ar: song.ar || song.artists, al: song.al || song.album, url: urlData.url });
    } catch {}
  };

  if (!query) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white/20">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
          <FontAwesomeIcon icon={faSearch} className="text-3xl" />
        </div>
        <p className="text-sm">输入关键词搜索歌曲、歌手、专辑</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">
        "<span className="text-cyan-400">{query}</span>"
      </h2>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              tab === t.key ? 'text-white' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {t.label}
            {tab === t.key && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-cyan-400 rounded-full" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-white/30">
          <FontAwesomeIcon icon={faSpinner} className="text-xl animate-spin" />
        </div>
      ) : (
        <div>
          {/* 综合 tab */}
          {tab === 1014 && (
            <div className="space-y-10">
              {/* 顶部：歌手 + 歌单推荐 */}
              {(artists.length > 0 || playlists.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {artists.length > 0 && (
                    <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-5 cursor-pointer hover:bg-white/8 transition-colors">
                      <img src={(artists[0].picUrl || artists[0].pic || '') + '?param=200y200'} className="w-20 h-20 rounded-full object-cover shrink-0" />
                      <div>
                        <p className="text-xs text-white/40 mb-0.5">歌手</p>
                        <p className="text-lg font-bold text-white">{artists[0].name}</p>
                        <div className="flex gap-4 mt-1 text-xs text-white/35">
                          <span>单曲:{artists[0].musicSize || artists[0].albumSize || '—'}</span>
                          <span>粉丝:{artists[0].followeds ? formatCount(artists[0].followeds) : '—'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {playlists.length > 0 && (
                    <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-5 cursor-pointer hover:bg-white/8 transition-colors" onClick={() => navigate(`/playlist/${playlists[0].id}`)}>
                      <img src={(playlists[0].coverImgUrl || playlists[0].picUrl || '') + '?param=200y200'} className="w-20 h-20 rounded-xl object-cover shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-white/40 mb-0.5">歌单</p>
                        <p className="text-base font-bold text-white truncate">{playlists[0].name}</p>
                        <p className="text-xs text-white/35 mt-1 truncate">{playlists[0].creator?.nickname || ''}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 单曲 - 两列 */}
              {songs.length > 0 && (
                <div>
                  <SectionTitle title="单曲" />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
                    {songs.slice(0, 6).map((song, i) => (
                      <SongRow key={song.id} song={song} index={i + 1} hoveredId={hoveredId} setHoveredId={setHoveredId}
                        isPlaying={currentSong?.id === song.id} onPlay={() => playSong(song)} />
                    ))}
                  </div>
                </div>
              )}

              {/* 歌单 - 横向滚动 */}
              {playlists.length > 0 && (
                <div>
                  <SectionTitle title="歌单" />
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {playlists.slice(0, 8).map((pl) => (
                      <div key={pl.id} className="shrink-0 w-40 cursor-pointer group" onClick={() => navigate(`/playlist/${pl.id}`)}>
                        <div className="aspect-square rounded-xl overflow-hidden mb-2 relative">
                          <img src={(pl.coverImgUrl || pl.picUrl || '') + '?param=300y300'} className="w-full h-full object-cover" />
                          {pl.playCount > 0 && (
                            <div className="absolute top-1.5 right-1.5 bg-black/50 rounded px-1 py-0.5 text-[10px] text-white/90">
                              ▶ {formatCount(pl.playCount)}
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-white/70 truncate group-hover:text-white">{pl.name}</p>
                        <p className="text-[10px] text-white/30 mt-0.5 truncate">{pl.creator?.nickname || ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 歌手 - 横向滚动 */}
              {artists.length > 1 && (
                <div>
                  <SectionTitle title="歌手" />
                  <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2">
                    {artists.slice(1, 8).map((a) => (
                      <div key={a.id} className="shrink-0 flex flex-col items-center text-center cursor-pointer group w-24">
                        <img src={(a.picUrl || a.pic || '') + '?param=200y200'} className="w-20 h-20 rounded-full object-cover mb-2" />
                        <p className="text-xs text-white/70 truncate w-full group-hover:text-white">{a.name}</p>
                        <p className="text-[10px] text-white/30">单曲: {a.musicSize || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 专辑 - 横向滚动 */}
              {albums.length > 0 && (
                <div>
                  <SectionTitle title="专辑" />
                  <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                    {albums.slice(0, 8).map((al) => (
                      <div key={al.id} className="shrink-0 w-40 cursor-pointer group">
                        <div className="aspect-square rounded-xl overflow-hidden mb-2">
                          <img src={(al.picUrl || al.blurPicUrl || '') + '?param=300y300'} className="w-full h-full object-cover" />
                        </div>
                        <p className="text-xs text-white/70 truncate group-hover:text-white">{al.name}</p>
                        <p className="text-[10px] text-white/30 mt-0.5 truncate">{al.artist?.name || ''} · {al.publishTime ? new Date(al.publishTime).getFullYear() : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 单曲 tab */}
          {tab === 1 && (
            <div>
              <div className="grid grid-cols-[40px_1fr_80px] gap-4 px-3 py-2 text-xs text-white/25 border-b border-white/5 mb-1">
                <span className="text-center">#</span><span>歌曲</span><span className="text-right"><FontAwesomeIcon icon={faClock} /></span>
              </div>
              {songs.map((song, i) => (
                <SongRow key={song.id} song={song} index={i + 1} hoveredId={hoveredId} setHoveredId={setHoveredId}
                  isPlaying={currentSong?.id === song.id} onPlay={() => playSong(song)} showAlbum />
              ))}
            </div>
          )}

          {/* 歌单 tab */}
          {tab === 1000 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {playlists.map((pl) => (
                <PlaylistCard key={pl.id} item={pl} onClick={() => navigate(`/playlist/${pl.id}`)} />
              ))}
            </div>
          )}

          {/* 专辑 tab */}
          {tab === 10 && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {albums.map((al) => <AlbumCard key={al.id} item={al} />)}
            </div>
          )}

          {/* 歌手 tab */}
          {tab === 100 && (
            <div className="grid grid-cols-3 lg:grid-cols-5 gap-5">
              {artists.map((a) => <ArtistCard key={a.id} item={a} />)}
            </div>
          )}

          {!loading && tab === 1 && songs.length === 0 && <Empty />}
          {!loading && tab === 1000 && playlists.length === 0 && <Empty />}
          {!loading && tab === 10 && albums.length === 0 && <Empty />}
          {!loading && tab === 100 && artists.length === 0 && <Empty />}
        </div>
      )}

    </div>
  );
};

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <h3 className="text-base font-bold text-white">{title}</h3>
      <span className="text-white/20 text-xs">›</span>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-white/20">
      <FontAwesomeIcon icon={faSearch} className="text-2xl mb-3" />
      <p className="text-sm">没有找到相关结果</p>
    </div>
  );
}

function SongRow({ song, index, hoveredId, setHoveredId, isPlaying, onPlay, showAlbum }: {
  song: any; index: number; hoveredId: number | null; setHoveredId: (id: number | null) => void;
  isPlaying: boolean; onPlay: () => void; showAlbum?: boolean;
}) {
  const artists = song.ar || song.artists || [];
  const album = song.al || song.album || {};
  return (
    <div
      onClick={onPlay}
      onMouseEnter={() => setHoveredId(song.id)}
      onMouseLeave={() => setHoveredId(null)}
      className={`grid grid-cols-[40px_1fr${showAlbum ? '_1fr' : ''}_80px] gap-4 items-center px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isPlaying ? 'bg-cyan-500/10' : hoveredId === song.id ? 'bg-white/5' : ''
      }`}
    >
      <span className={`text-xs text-center tabular-nums ${isPlaying ? 'text-cyan-400' : 'text-white/25'}`}>
        {isPlaying ? <FontAwesomeIcon icon={faMusic} className="text-cyan-400 text-[10px]" /> : String(index).padStart(2, '0')}
      </span>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 relative">
          <img src={(album.picUrl || '') + '?param=60y60'} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          {!album.picUrl && <div className="absolute inset-0 bg-white/5 flex items-center justify-center"><FontAwesomeIcon icon={faMusic} className="text-white/15 text-xs" /></div>}
          <div className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${hoveredId === song.id ? 'opacity-100' : 'opacity-0'}`}>
            <FontAwesomeIcon icon={faPlay} className="text-white text-xs" />
          </div>
        </div>
        <div className="min-w-0">
          <p className={`text-sm truncate ${isPlaying ? 'text-cyan-400' : 'text-white/80'}`}>{song.name}</p>
          <div className="flex items-center gap-1.5 text-xs text-white/35 truncate">
            {artists.map((a: any) => a.name).join(' / ')}
          </div>
        </div>
      </div>
      {showAlbum && <p className="text-xs text-white/30 truncate hidden md:block">{album.name}</p>}
      <p className="text-xs text-white/25 text-right tabular-nums">{formatDuration(song.dt || song.duration || 0)}</p>
      <div onClick={(e) => e.stopPropagation()}>
        <SongMenu song={{ id: song.id, name: song.name, ar: artists, al: album }} />
      </div>
    </div>
  );
}

function PlaylistCard({ item, onClick }: { item: any; onClick: () => void }) {
  return (
    <div onClick={onClick} className="flex items-center gap-3 bg-white/5 rounded-xl p-3 hover:bg-white/8 transition-colors cursor-pointer">
      <img src={(item.coverImgUrl || item.picUrl || '') + '?param=200y200'} className="w-14 h-14 rounded-lg object-cover shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/80 truncate">{item.name}</p>
        <p className="text-xs text-white/35 mt-0.5 truncate">{item.trackCount || 0} 首 · {item.playCount ? formatCount(item.playCount) + '次播放' : ''}</p>
      </div>
    </div>
  );
}

function ArtistCard({ item }: { item: any }) {
  return (
    <div className="flex flex-col items-center text-center cursor-pointer group">
      <img src={(item.picUrl || item.pic || '') + '?param=200y200'} className="w-24 h-24 rounded-full object-cover mb-2" />
      <p className="text-sm text-white/80 truncate w-full">{item.name}</p>
      {item.alias?.[0] && <p className="text-xs text-white/30 truncate w-full">{item.alias[0]}</p>}
    </div>
  );
}

function AlbumCard({ item }: { item: any }) {
  return (
    <div className="bg-white/5 rounded-xl p-4 hover:bg-white/8 transition-colors cursor-pointer">
      <img src={(item.picUrl || item.blurPicUrl || '') + '?param=300y300'} className="w-full aspect-square rounded-lg object-cover mb-3" />
      <p className="text-sm text-white/80 truncate font-medium">{item.name}</p>
      <p className="text-xs text-white/35 mt-1 truncate">{item.artist?.name || ''}</p>
    </div>
  );
}

export default SearchPage;
