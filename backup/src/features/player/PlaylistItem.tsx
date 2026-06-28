import { memo } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay } from '@fortawesome/free-solid-svg-icons';
import SongMenu from '../../components/SongMenu';

interface PlaylistItemProps {
  song: {
    id: number;
    name: string;
    artist: string;
    cover: string;
  };
  onClick?: () => void;
}

const PlaylistItem: FC<PlaylistItemProps> = memo(({ song, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 cursor-pointer transition-all group"
    >
      <img src={song.cover} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate">{song.name}</p>
        <p className="text-[10px] text-white/40">{song.artist}</p>
      </div>
      <FontAwesomeIcon icon={faPlay} className="text-white/20 text-xs group-hover:text-white/60 transition-colors" />
      <div onClick={(e) => e.stopPropagation()}>
        <SongMenu song={{ id: song.id, name: song.name, ar: [{ name: song.artist }], al: { picUrl: song.cover } }} />
      </div>
    </div>
  );
});

PlaylistItem.displayName = 'PlaylistItem';

export default PlaylistItem;
