import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlay, faPause, faHeart, faHeadphones, faClock, faPlayCircle } from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '../../context/PlayerContext';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';
import { getPlaylistDetail, getPlaylistTrackAll, getSongUrl } from '../../services/api';
import { formatDuration, formatCount } from '../../utils/format';
import { getDailyCache, setDailyCache } from '../../utils/dailyCache';
import CommentSection from '../../components/CommentSection';
import SongMenu from '../../components/SongMenu';

interface Track {
  id: number;
  name: string;
  ar: { name: string }[];
  al: { picUrl: string; name: string };
  dt: number;
}

interface PlaylistDetail {
  id: number;
  name: string;
  coverImgUrl: string;
  description: string;
  trackCount: number;
  playCount: number;
  creator: { nickname: string; avatarUrl: string };
  tracks: Track[];
}

const playlistCache = new Map<number, PlaylistDetail>();

const PlaylistDetailView: FC = () => {
  const { t } = useI18n();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playlistId = Number(id);
  const { play, isPlaying, togglePlay, setQueue } = usePlayer();
  const { currentSong } = useData();
  const { subscribedPlaylists, createdPlaylists } = useAuth();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [showCount, setShowCount] = useState(30);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const fetchAllTracks = async (base: PlaylistDetail) => {
      const allSongs: Track[] = [...base.tracks];
      let offset = allSongs.length;
      const batchSize = 100;

      const fetchNext = async () => {
        if (cancelledRef.current) return;
        try {
          const res = await getPlaylistTrackAll(playlistId, batchSize, offset);
          const songs = res.data.songs || [];
          if (songs.length === 0) {
            const final = { ...base, tracks: allSongs };
            setPlaylist(final);
            playlistCache.set(playlistId, final);
            setDailyCache(`playlist_detail_${playlistId}`, final);
            return;
          }
          allSongs.push(...songs);
          offset += songs.length;
          setPlaylist({ ...base, tracks: [...allSongs] });
          if (!cancelledRef.current) requestIdleCallback(fetchNext, { timeout: 500 });
        } catch {
          const final = { ...base, tracks: allSongs };
          setPlaylist(final);
          playlistCache.set(playlistId, final);
          setDailyCache(`playlist_detail_${playlistId}`, final);
        }
      };
      requestIdleCallback(fetchNext, { timeout: 500 });
    };

    const fetchPlaylist = async () => {
      try {
        // 先检查本地歌单
        const localPl = [...subscribedPlaylists, ...createdPlaylists].find(p => p.id === playlistId);
        if (localPl && (localPl as any).tracks?.length) {
          const localPlaylist: PlaylistDetail = {
            id: localPl.id,
            name: localPl.name,
            coverImgUrl: localPl.picUrl || '',
            description: '',
            trackCount: (localPl as any).tracks.length,
            playCount: localPl.playCount || 0,
            creator: { nickname: '', avatarUrl: '' },
            tracks: (localPl as any).tracks,
          };
          setPlaylist(localPlaylist);
          setLoading(false);
          return;
        }

        // 内存缓存
        const cached = playlistCache.get(playlistId);
        if (cached) {
          setPlaylist(cached);
          setLoading(false);
          return;
        }

        // 磁盘缓存
        const diskCached = await getDailyCache<PlaylistDetail>(`playlist_detail_${playlistId}`);
        if (cancelledRef.current) return;
        if (diskCached) {
          setPlaylist(diskCached);
          setLoading(false);
          playlistCache.set(playlistId, diskCached);
          return;
        }

        const detailRes = await getPlaylistDetail(playlistId);
        if (cancelledRef.current) return;

        const p = detailRes.data.playlist;
        if (!p) return;

        const basePlaylist: PlaylistDetail = {
          id: p.id,
          name: p.name,
          coverImgUrl: p.coverImgUrl,
          description: p.description || '',
          trackCount: p.trackCount || 0,
          playCount: p.playCount,
          creator: { nickname: p.creator?.nickname || '', avatarUrl: p.creator?.avatarUrl || '' },
          tracks: p.tracks || [],
        };

        setPlaylist(basePlaylist);
        setLoading(false);
        playlistCache.set(playlistId, basePlaylist);
        setDailyCache(`playlist_detail_${playlistId}`, basePlaylist);
        fetchAllTracks(basePlaylist);
      } catch {
        if (!cancelledRef.current) setLoading(false);
      }
    };

    fetchPlaylist();
    return () => { cancelledRef.current = true; };
  }, [playlistId, subscribedPlaylists, createdPlaylists]);

  const playTrack = async (track: Track) => {
    if (playingId === track.id && currentSong?.id === track.id) {
      togglePlay();
      return;
    }
    setPlayingId(track.id);
    try {
      const res = await getSongUrl(track.id);
      const urlData = res.data.data?.[0];
      if (!urlData?.url) return;
      play({ ...track, url: urlData.url });
    } catch {
      setPlayingId(null);
    }
  };

  const playAll = async () => {
    if (!playlist?.tracks.length) return;
    setQueue(playlist.tracks.map((t) => ({
      id: t.id,
      name: t.name,
      ar: t.ar,
      al: t.al,
      dt: t.dt,
    })));
    await playTrack(playlist.tracks[0]);
  };

  const trackEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = trackEndRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && playlist) {
          setShowCount((prev) => Math.min(prev + 30, playlist.tracks.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [playlist]);

  if (!playlistId) return null;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-8 pb-20">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        <span>{t('back')}</span>
      </button>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-white/30">
          <FontAwesomeIcon icon={faClock} className="text-2xl animate-spin" />
        </div>
      ) : !playlist ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <p className="text-sm">{t('playlist.load_failed')}</p>
        </div>
      ) : (
        <>
          {/* 歌单头部 */}
          <div className="flex gap-6 mb-8">
            <img
              src={playlist.coverImgUrl ? playlist.coverImgUrl + '?param=300y300' : '/playlist-covers/happy/1.jpg'}
              className="w-40 h-40 rounded-2xl object-cover shadow-lg border border-white/10 shrink-0"
              alt={playlist.name}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-extrabold text-white tracking-tight mb-2">{playlist.name}</h1>
              <div className="flex items-center gap-2 mb-3">
                <img
                  src={playlist.creator.avatarUrl + '?param=40y40'}
                  className="w-6 h-6 rounded-full object-cover border border-white/20"
                  alt="creator"
                />
                <span className="text-xs text-white/60">{playlist.creator.nickname}</span>
              </div>
              <p className="text-xs text-white/30 mb-4 line-clamp-2">{playlist.description}</p>
              <div className="flex items-center gap-4 text-xs text-white/40">
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faHeart} className="text-rose-400/60 text-[10px]" />
                  {t('playlist.tracks', { count: playlist.trackCount })}
                </span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faHeadphones} className="text-cyan-400/60 text-[10px]" />
                  {t('playlist.plays', { count: formatCount(playlist.playCount) })}
                </span>
                <button
                  onClick={playAll}
                  className="flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
                >
                  <FontAwesomeIcon icon={faPlayCircle} className="text-xs" />
                  <span className="text-[11px] font-medium">{t('playlist.play_all')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* 歌曲列表 */}
          <div>
            <div className="flex items-center px-3 py-2.5 text-[10px] font-bold text-white/40 uppercase tracking-wider clear-glass-card rounded-xl mb-2 sticky top-0 z-10">
              <span className="w-8 text-center">#</span>
              <span className="flex-1 px-2">{t('playlist.col_songs')}</span>
              <span className="w-32 px-2 hidden lg:block">{t('playlist.col_artist')}</span>
              <span className="w-16 text-right px-2">{t('playlist.col_duration')}</span>
            </div>

            {playlist.tracks.slice(0, showCount).map((track, i) => {
              const isPlayingTrack = currentSong?.id === track.id && isPlaying;
              return (
                <div
                  key={track.id}
                  onClick={() => playTrack(track)}
                  className={`flex items-center px-3 py-2.5 rounded-xl cursor-pointer transition-all group ${
                    isPlayingTrack
                      ? 'bg-cyan-400/10 border border-cyan-400/20'
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span className={`w-8 text-center text-xs ${isPlayingTrack ? 'text-cyan-400' : 'text-white/25'}`}>
                    {isPlayingTrack ? (
                      <FontAwesomeIcon icon={faPause} className="text-[10px]" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="flex-1 flex items-center gap-3 px-2 min-w-0">
                    <img src={track.al.picUrl + '?param=60y60'} className="w-8 h-8 rounded-lg object-cover shrink-0" loading="lazy" />
                    <span className={`text-xs truncate ${isPlayingTrack ? 'text-cyan-400' : 'text-white/80'}`}>
                      {track.name}
                    </span>
                  </div>
                  <span className="w-32 px-2 text-xs text-white/40 truncate hidden lg:block">
                    {track.ar?.[0]?.name}
                  </span>
                  <span className="w-16 text-right px-2 text-[10px] text-white/25 font-mono">
                    {formatDuration(track.dt)}
                  </span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <SongMenu song={track} />
                  </div>
                </div>
              );
            })}

            {showCount < playlist.tracks.length && (
              <div ref={trackEndRef} className="py-4 text-center text-[11px] text-white/25">
                {t('playlist.load_more')}
              </div>
            )}
          </div>
        </>
      )}

      {playlistId && <CommentSection id={playlistId} type={1} />}
    </div>
  );
};

export default PlaylistDetailView;
