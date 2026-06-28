import type { FC } from 'react';
import NowPlaying from './NowPlaying';
import PlaylistPanel from './PlaylistPanel';
import SleepTimer from './SleepTimer';
import { usePlayer } from '../../context/PlayerContext';

interface RightPanelProps {
  onOpenFullscreen: (rect: DOMRect) => void;
  isCompact?: boolean;
}

const RightPanel: FC<RightPanelProps> = ({ onOpenFullscreen, isCompact }) => {
  const { sleepTimer, clearSleepTimer } = usePlayer();

  return (
    <aside className={`${isCompact ? 'w-full h-auto' : 'w-[22%] min-w-[240px] max-w-[300px] ml-6 pr-6'} flex flex-col gap-2 ${isCompact ? 'pt-4' : 'pt-[110px]'} pb-3 h-full min-h-0 overflow-hidden`}>
      {sleepTimer > 0 && (
        <div className="shrink-0 flex justify-center">
          <SleepTimer onClear={clearSleepTimer} />
        </div>
      )}
      <NowPlaying onOpenFullscreen={onOpenFullscreen} />
      {!isCompact && <PlaylistPanel />}
    </aside>
  );
};

export default RightPanel;
