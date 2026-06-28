import { useState, useEffect, useRef, useCallback } from 'react';
import type { FC } from 'react';
import { usePlayer } from '../../context/PlayerContext';
import { useData } from '../../context/DataContext';
import { getLyric } from '../../services/api';
import { parseLyric, type LyricLine } from '../../utils/format';

const LyricPanel: FC = () => {
  const { currentSong } = useData();
  const { progress, audioRef } = usePlayer();
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentSong) return;
    setLyrics([]);
    setActiveIndex(0);
    getLyric(currentSong.id).then((res) => {
      const lrc = res.data.lrc?.lyric || '';
      setLyrics(parseLyric(lrc));
    }).catch(() => {});
  }, [currentSong?.id]);

  useEffect(() => {
    if (lyrics.length === 0 || !audioRef.current) return;
    const currentTime = audioRef.current.currentTime;
    let idx = 0;
    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (currentTime >= lyrics[i].time) {
        idx = i;
        break;
      }
    }
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      const container = containerRef.current;
      if (container) {
        const activeEl = container.children[idx] as HTMLElement;
        if (activeEl) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [progress, lyrics, activeIndex, audioRef]);

  const seekToLine = useCallback((time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
    }
  }, [audioRef]);

  if (lyrics.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white/20 text-sm">
        {currentSong ? '暂无歌词' : '播放歌曲后显示歌词'}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto no-scrollbar py-8"
    >
      {lyrics.map((line, i) => (
        <div
          key={i}
          onClick={() => seekToLine(line.time)}
          className={`py-2 px-4 transition-all duration-300 cursor-pointer ${
            i === activeIndex
              ? 'text-white text-base font-bold scale-105'
              : 'text-white/30 text-sm hover:text-white/50'
          }`}
        >
          {line.text}
        </div>
      ))}
    </div>
  );
};

export default LyricPanel;
