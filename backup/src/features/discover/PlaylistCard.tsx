import React, { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayer } from '../../context/PlayerContext';
import { getSongUrl } from '../../services/api';
import { formatCount } from '../../utils/format';
import type { Playlist, PlaylistSong } from '../../context/types';

interface PlaylistCardProps {
  playlist: Playlist;
}

const PlaylistCard: React.FC<PlaylistCardProps> = memo(({ playlist }) => {
  const { play } = usePlayer();
  const navigate = useNavigate();
  const [playingId, setPlayingId] = useState<number | null>(null);

  const songs = playlist.songs?.slice(0, 2) ?? [];

  const playSong = async (e: React.MouseEvent, song: PlaylistSong) => {
    e.stopPropagation();
    if (playingId === song.id) return;
    setPlayingId(song.id);
    try {
      const urlRes = await getSongUrl(song.id);
      const url = urlRes.data.data?.[0]?.url;
      if (url) {
        play({ ...song, url });
      }
    } catch {
      // song url unavailable
    } finally {
      setPlayingId(null);
    }
  };

  return (
    <div className="group cursor-pointer" onClick={() => navigate(`/playlist/${playlist.id}`)}>
      <div className="aspect-square rounded-[28px] overflow-hidden mb-3 relative shadow-lg border border-white/10 group-hover:border-cyan-400/30 transition-colors duration-200">
        <img src={playlist.picUrl + '?param=400y400'} className="w-full h-full object-cover" alt={playlist.name} />
        {playlist.playCount !== undefined && (
          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[10px] text-white/90 font-medium">
            ▶ {formatCount(playlist.playCount)}
          </div>
        )}
        <div className="absolute inset-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white/80 rounded-tl-sm" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white/80 rounded-tr-sm" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white/80 rounded-bl-sm" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white/80 rounded-br-sm" />
        </div>
      </div>
      <p className="text-xs font-bold text-white truncate px-1 mb-2 text-center">{playlist.name}</p>

      {songs.length > 0 && (
        <div className="space-y-1.5 px-0.5">
          {songs.map((song) => (
            <div
              key={song.id}
              onClick={(e) => playSong(e, song)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            >
              <img src={song.al.picUrl + '?param=60y60'} className="w-7 h-7 rounded-md object-cover shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-white/80 truncate">{song.name}</p>
                <p className="text-[9px] text-white/40 truncate">{song.ar?.[0]?.name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

PlaylistCard.displayName = 'PlaylistCard';

export default PlaylistCard;
