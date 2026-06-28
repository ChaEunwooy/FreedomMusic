import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock } from '@fortawesome/free-solid-svg-icons';
import PlaylistItem from './PlaylistItem';
import { usePlayer } from '../../context/PlayerContext';
import { getSongUrl } from '../../services/api';

const PlaylistPanel: FC = () => {
  const { queue, queueIndex, play, currentSong } = usePlayer();

  const upcoming = queue.slice(queueIndex + 1);
  const totalCount = queue.length;

  const playSong = async (song: { id: number; name: string; ar: { name: string }[]; al: { picUrl: string }; url?: string }) => {
    try {
      let url = song.url;
      if (!url) {
        const res = await getSongUrl(song.id);
        url = res.data.data?.[0]?.url;
      }
      if (!url) return;
      play({ ...song, url });
    } catch {}
  };

  return (
    <div className="clear-glass p-4 flex-[2] min-h-0 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 px-2">
        <span className="text-[11px] font-bold text-white/40 uppercase tracking-widest">待播放歌曲</span>
        <span className="text-[10px] text-white/30">{totalCount} 首</span>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
        {totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/20">
            <p className="text-xs">暂无待播放歌曲</p>
          </div>
        ) : (
          <>
            {currentSong && (
              <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-bold text-white/50">正在播放</span>
              </div>
            )}
            {currentSong && (
              <div className="flex items-center gap-3 p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 mx-1">
                <img src={currentSong.al.picUrl + '?param=80y80'} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-cyan-400 truncate">{currentSong.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{currentSong.ar?.[0]?.name}</p>
                </div>
              </div>
            )}
            {upcoming.length > 0 && (
              <>
                <div className="flex items-center gap-2 px-2 pt-2 pb-1">
                  <FontAwesomeIcon icon={faClock} className="text-white/30 text-[10px]" />
                  <span className="text-[10px] font-bold text-white/50">即将播放</span>
                </div>
                {upcoming.map((song) => (
                  <PlaylistItem
                    key={song.id}
                    song={{
                      id: song.id,
                      name: song.name,
                      artist: song.ar[0]?.name ?? '未知',
                      cover: song.al.picUrl,
                    }}
                    onClick={() => playSong(song)}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default PlaylistPanel;
