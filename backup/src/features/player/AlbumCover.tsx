import type { FC } from 'react';
import { useData } from '../../context/DataContext';

const AlbumCover: FC = () => {
  const { currentSong } = useData();

  if (!currentSong) return null;

  return (
    <div className="w-full max-w-[170px] mx-auto aspect-square rounded-[30px] overflow-hidden mb-5 shadow-2xl border border-white/15 relative group">
      <img src={currentSong.al.picUrl + '?param=600y600'} className="w-full h-full object-cover" />
    </div>
  );
};

export default AlbumCover;
