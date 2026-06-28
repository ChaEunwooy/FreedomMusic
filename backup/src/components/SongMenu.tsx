import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEllipsis, faPlay, faForward, faHeart, faListOl } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartReg } from '@fortawesome/free-regular-svg-icons';
import { usePlayer } from '../context/PlayerContext';
import { likeSong } from '../services/api';
import AddToPlaylistModal from '../features/playlist/AddToPlaylistModal';

interface SongMenuProps {
  song: {
    id: number;
    name: string;
    ar: { name: string }[];
    al: { picUrl: string };
    dt?: number;
  };
}

const SongMenu: FC<SongMenuProps> = ({ song }) => {
  const [open, setOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const { play, insertNext } = usePlayer();
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handlePlay = useCallback(async () => {
    setOpen(false);
    try {
      const { getSongUrl } = await import('../services/api');
      const res = await getSongUrl(song.id);
      const url = res.data.data?.[0]?.url;
      if (url) play({ ...song, url });
    } catch {}
  }, [song, play]);

  const handleInsertNext = useCallback(() => {
    setOpen(false);
    insertNext(song as any);
  }, [song, insertNext]);

  const handleLike = useCallback(async () => {
    setOpen(false);
    try {
      await likeSong(song.id, !liked);
      setLiked(!liked);
    } catch {}
  }, [song.id, liked]);

  const handleAddToPlaylist = useCallback(() => {
    setOpen(false);
    setShowAddModal(true);
  }, []);

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          ref={btnRef}
          onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/0 group-hover:text-white/40 hover:!text-white/80 hover:bg-white/10 transition-all"
        >
          <FontAwesomeIcon icon={faEllipsis} className="text-xs" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-white/10 backdrop-blur-2xl rounded-xl py-1.5 min-w-[140px] shadow-xl border border-white/15">
            <MenuItem icon={faPlay} label="播放" onClick={handlePlay} />
            <MenuItem icon={faForward} label="下一首播放" onClick={handleInsertNext} />
            <div className="h-px bg-white/10 my-1 mx-2" />
            <MenuItem
              icon={liked ? faHeart : faHeartReg}
              label={liked ? '取消喜欢' : '喜欢'}
              onClick={handleLike}
              iconClass={liked ? 'text-red-400' : ''}
            />
            <MenuItem icon={faListOl} label="添加到歌单" onClick={handleAddToPlaylist} />
          </div>
        )}
      </div>
      <AddToPlaylistModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        trackIds={[song.id]}
      />
    </>
  );
};

function MenuItem({ icon, label, onClick, iconClass = '' }: {
  icon: typeof faPlay; label: string; onClick: () => void; iconClass?: string;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-white/60 hover:text-white hover:bg-white/10 transition-colors"
    >
      <FontAwesomeIcon icon={icon} className={`text-[10px] w-4 text-center ${iconClass}`} />
      <span>{label}</span>
    </button>
  );
}

export default SongMenu;
