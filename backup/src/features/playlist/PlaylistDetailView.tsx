import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlay, faHeart, faHeadphones, faClock, faPlayCircle } from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '../../context/PlayerContext';
import { useData } from '../../context/DataContext';
import { getPlaylistDetail, getPlaylistTrackAll, getSongUrl } from '../../services/api';
import { formatDuration, formatCount } from '../../utils/format';
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

const PlaylistDetailView: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const playlistId = Number(id);
  const { play, isPlaying, setQueue } = usePlayer();
  const { currentSong } = useData();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [showCount, setShowCount] = useState(50);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchPlaylist = async () => {
      try {
        const detailRes = await getPlaylistDetail(playlistId);
        if (cancelled) return;

        const p = detailRes.data.playlist;
        const allSongs: Track[] = [];
        let offset = 0;
        const batchSize = 100;
        while (!cancelled) {
          const res = await getPlaylistTrackAll(playlistId, batchSize, offset);
          const songs = res.data.songs || [];
          allSongs.push(...songs);
          if (songs.length < batchSize || cancelled) break;
          offset += batchSize;
        }

        if (p && !cancelled) {
          setPlaylist({
            id: p.id,
            name: p.name,
            coverImgUrl: p.coverImgUrl,
            description: p.description || '',
            trackCount: p.trackCount || allSongs.length,
            playCount: p.playCount,
            creator: { nickname: p.creator?.nickname || '', avatarUrl: p.creator?.avatarUrl || '' },
            tracks: allSongs,
          });
        }
      } catch {
        if (!cancelled) setLoading(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPlaylist();
    return () => { cancelled = true; };
  }, [playlistId]);

  const playTrack = async (track: Track) => {
    if (playingId === track.id && isPlaying && currentSong?.id === track.id) return;
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

  if (!playlistId) return null;

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-8 pb-20">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-white/50 hover:text-white text-sm mb-6 transition-colors"
      >
        <FontAwesomeIcon icon={faArrowLeft} />
        <span>返回</span>
      </button>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-white/30">
          <FontAwesomeIcon icon={faClock} className="text-2xl animate-spin" />
        </div>
      ) : !playlist ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <p className="text-sm">歌单加载失败</p>
        </div>
      ) : (
        <>
          {/* 歌单头部 */}
          <div className="flex gap-6 mb-8">
            <img
              src={playlist.coverImgUrl + '?param=300y300'}
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
                  {playlist.trackCount} 首
                </span>
                <span className="flex items-center gap-1">
                  <FontAwesomeIcon icon={faHeadphones} className="text-cyan-400/60 text-[10px]" />
                  {formatCount(playlist.playCount)} 播放
                </span>
                <button
                  onClick={playAll}
                  className="flex items-center gap-1.5 ml-2 px-3 py-1.5 rounded-full bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
                >
                  <FontAwesomeIcon icon={faPlayCircle} className="text-xs" />
                  <span className="text-[11px] font-medium">全部播放</span>
                </button>
              </div>
            </div>
          </div>

          {/* 歌曲列表 */}
          <div>
            <div className="flex items-center px-3 py-2.5 text-[10px] font-bold text-white/40 uppercase tracking-wider clear-glass-card rounded-xl mb-2 sticky top-0 z-10">
              <span className="w-8 text-center">#</span>
              <span className="flex-1 px-2">歌曲</span>
              <span className="w-32 px-2 hidden lg:block">歌手</span>
              <span className="w-16 text-right px-2">时长</span>
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
                      <FontAwesomeIcon icon={faPlay} className="text-[10px]" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="flex-1 flex items-center gap-3 px-2 min-w-0">
                    <img src={track.al.picUrl + '?param=60y60'} className="w-8 h-8 rounded-lg object-cover shrink-0" />
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
              <button
                onClick={() => setShowCount((prev) => Math.min(prev + 50, playlist.tracks.length))}
                className="w-full py-3 mt-2 rounded-xl bg-white/5 text-[11px] text-white/40 hover:bg-white/8 hover:text-white/60 transition-all"
              >
                {playlist.tracks.length - showCount > 50
                  ? `点击加载 50 首`
                  : `显示剩余 ${playlist.tracks.length - showCount} 首`}
              </button>
            )}
          </div>
        </>
      )}

      {playlistId && <CommentSection id={playlistId} type={1} />}
    </div>
  );
};

export default PlaylistDetailView;
