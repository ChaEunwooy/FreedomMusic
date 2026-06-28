import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlay, faSpinner, faMusic } from '@fortawesome/free-solid-svg-icons';
import { getArtistDetail, getArtistTopSong, getSongUrl } from '../../services/api';
import { formatDuration } from '../../utils/format';
import { usePlayer } from '../../context/PlayerContext';
import SongMenu from '../../components/SongMenu';
import { getDailyCache, setDailyCache } from '../../utils/dailyCache';
import { useI18n } from '../../i18n';

const ArtistDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { play, currentSong } = usePlayer();
  const [artist, setArtist] = useState<any>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    const load = async () => {
      const cacheKey = `artist_detail_${id}`;
      const cached = await getDailyCache<{ artist: any; songs: any[] }>(cacheKey);
      if (cached) {
        setArtist(cached.artist);
        setSongs(cached.songs);
        setLoading(false);
        return;
      }
      try {
        const [detailRes, topRes] = await Promise.all([
          getArtistDetail(Number(id)),
          getArtistTopSong(Number(id)),
        ]);
        const artistData = detailRes.data.artist;
        const songsData = topRes.data.songs || [];
        setArtist(artistData);
        setSongs(songsData);
        setLoading(false);
        setDailyCache(cacheKey, { artist: artistData, songs: songsData });
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

  if (!artist) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-white/30">
        <p className="text-sm">{t('artist.not_found')}</p>
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
        <img src={artist.picUrl + '?param=400y400'} className="w-36 h-36 rounded-full object-cover shadow-2xl border-2 border-white/10" />
        <div className="min-w-0 pb-2">
          <p className="text-xs text-white/40 mb-1">{t('artist.title')}</p>
          <h1 className="text-3xl font-extrabold text-white mb-1">{artist.name}</h1>
          {artist.alias?.[0] && <p className="text-sm text-white/40">{artist.alias[0]}</p>}
          <div className="flex gap-4 mt-2 text-xs text-white/30">
            <span>{t('artist.singles', {count: artist.musicSize || '—'})}</span>
            <span>{t('artist.albums', {count: artist.albumSize || '—'})}</span>
            <span>{t('artist.followers', {count: artist.followeds || '—'})}</span>
          </div>
        </div>
      </div>

      {artist.briefDesc && (
        <p className="text-xs text-white/35 mb-6 leading-relaxed line-clamp-3">{artist.briefDesc}</p>
      )}

      {songs.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-white/40 text-xs mb-3">
            <FontAwesomeIcon icon={faMusic} className="text-[10px]" />
            <span>{t('artist.hot_songs', {count: songs.length})}</span>
          </div>
          <div className="space-y-0.5">
            {songs.slice(0, 20).map((song, i) => {
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
                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0">
                    <img src={(song.al?.picUrl || '') + '?param=60y60'} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${isPlaying ? 'text-cyan-400' : 'text-white/80'}`}>{song.name}</p>
                    {song.al?.name && <p className="text-[10px] text-white/30 truncate">{song.al.name}</p>}
                  </div>
                  <span className="text-[10px] text-white/25 tabular-nums">{formatDuration(song.dt || 0)}</span>
                  <div onClick={(e) => e.stopPropagation()}>
                    <SongMenu song={{ id: song.id, name: song.name, ar: song.ar || [], al: song.al || { picUrl: '' } }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistDetail;
