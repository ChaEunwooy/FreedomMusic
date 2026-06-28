import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlay, faSpinner, faMusic, faHeart } from '@fortawesome/free-solid-svg-icons';
import { getAlbumDetail, getSongUrl } from '../../services/api';
import { formatDuration } from '../../utils/format';
import { usePlayer } from '../../context/PlayerContext';
import { useI18n } from '../../i18n';
import SongMenu from '../../components/SongMenu';
import { getDailyCache, setDailyCache } from '../../utils/dailyCache';

const AlbumDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { play, currentSong } = usePlayer();
  const { t } = useI18n();
  const [album, setAlbum] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const load = async () => {
      const cacheKey = `album_detail_${id}`;
      const cached = await getDailyCache<{ album: any; songs: any[] }>(cacheKey);
      if (cached) {
        setAlbum(cached.album);
        setSongs(cached.songs);
        setLoading(false);
        return;
      }
      try {
        const res = await getAlbumDetail(Number(id));
        const albumData = res.data.album;
        const songsData = res.data.songs || [];
        setAlbum(albumData);
        setSongs(songsData);
        setLoading(false);
        setDailyCache(cacheKey, { album: albumData, songs: songsData });
      } catch {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const playSong = async (song: any) => {
    try {
      const res = await getSongUrl(song.id);
      const url = res.data.data?.[0]?.url;
      if (url) play({ id: song.id, name: song.name, ar: song.ar, al: song.al, url });
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-white/30">
        <FontAwesomeIcon icon={faSpinner} className="text-2xl animate-spin" />
      </div>
    );
  }

  if (!album) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white/30">
        <p className="text-sm">{t('album.not_found')}</p>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-6 transition-colors">
        <FontAwesomeIcon icon={faArrowLeft} />
        <span>{t('back')}</span>
      </button>

      <div className="flex items-end gap-6 mb-8">
        <img src={(album.picUrl || album.blurPicUrl || '') + '?param=400y400'} className="w-36 h-36 rounded-2xl object-cover shadow-2xl border border-white/10" />
        <div className="min-w-0 pb-2">
          <p className="text-xs text-white/40 mb-1">{t('album.title')}</p>
          <h1 className="text-2xl font-extrabold text-white mb-1 truncate">{album.name}</h1>
          <p className="text-sm text-white/50">{album.artist?.name || ''}</p>
          <div className="flex gap-4 mt-2 text-xs text-white/30">
            {album.publishTime && <span>{new Date(album.publishTime).getFullYear()}</span>}
            <span>{t('tracks_count', { count: songs.length })}</span>
            {album.company && <span>{album.company}</span>}
          </div>
        </div>
      </div>

      {album.description && (
        <p className="text-xs text-white/35 mb-6 leading-relaxed line-clamp-3">{album.description}</p>
      )}

      {songs.length > 0 && (
        <div className="space-y-0.5">
          {songs.map((song, i) => {
            const isPlaying = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => playSong(song)}
                onMouseEnter={() => setHoveredId(song.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors ${
                  isPlaying ? 'bg-cyan-400/10' : hoveredId === song.id ? 'bg-white/5' : ''
                }`}
              >
                <span className={`w-7 text-center text-[10px] tabular-nums ${isPlaying ? 'text-cyan-400' : 'text-white/20'}`}>
                  {isPlaying ? <FontAwesomeIcon icon={faPlay} className="text-[9px]" /> : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${isPlaying ? 'text-cyan-400' : 'text-white/80'}`}>{song.name}</p>
                  {song.ar?.length > 0 && (
                    <p className="text-[10px] text-white/30 truncate">{song.ar.map((a: any) => a.name).join(' / ')}</p>
                  )}
                </div>
                <span className="text-[10px] text-white/25 tabular-nums">{formatDuration(song.dt || 0)}</span>
                <div onClick={(e) => e.stopPropagation()}>
                  <SongMenu song={{ id: song.id, name: song.name, ar: song.ar || [], al: song.al || { picUrl: '' } }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AlbumDetail;
