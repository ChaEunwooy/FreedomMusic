import type { FC } from 'react';
import { useData } from '../../context/DataContext';

const AlbumCover: FC = () => {
  const { currentSong } = useData();

  if (!currentSong) return null;

  return (
    <div className="w-full max-w-[120px] mx-auto aspect-square rounded-[16px] overflow-hidden mb-3 shadow-xl border border-white/15 relative group ">
      <img src={currentSong.al.picUrl + '?param=300y300'} className="w-full h-full object-cover " />
    </div>
  );
};

export default AlbumCover;
