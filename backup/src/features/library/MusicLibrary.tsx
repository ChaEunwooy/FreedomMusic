import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMusic, faUser, faCompactDisc, faFolder, faPlay } from '@fortawesome/free-solid-svg-icons';
import { usePlayer } from '../../context/PlayerContext';
import { getArtistList, getNewAlbums, getSongUrl } from '../../services/api';
import { formatDuration } from '../../utils/format';
import SongMenu from '../../components/SongMenu';

type Tab = 'songs' | 'artists' | 'albums' | 'folders';

const tabs: { key: Tab; label: string; icon: typeof faMusic }[] = [
  { key: 'songs', label: '歌曲', icon: faMusic },
  { key: 'artists', label: '歌手', icon: faUser },
  { key: 'albums', label: '专辑', icon: faCompactDisc },
  { key: 'folders', label: '文件夹', icon: faFolder },
];

interface Artist {
  id: number;
  name: string;
  picUrl: string;
  alias?: string[];
}

interface Album {
  id: number;
  name: string;
  picUrl: string;
  artist: { name: string };
  publishTime: number;
}

const MusicLibrary: FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('songs');
  const { play, queue, queueIndex, currentSong } = usePlayer();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'artists') {
      setLoading(true);
      getArtistList(100, 30).then((res) => {
        setArtists(res.data.artists || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    } else if (activeTab === 'albums') {
      setLoading(true);
      getNewAlbums(30).then((res) => {
        setAlbums(res.data.albums || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [activeTab]);

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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-10 pt-10 pb-4">
        <h1 className="text-3xl font-extrabold text-white mb-1 tracking-tight">音乐库</h1>
        <p className="text-white/40 text-sm mb-6">管理你的音乐收藏</p>

        <div className="flex gap-6 border-b border-white/10">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'text-white border-cyan-400'
                  : 'text-white/40 border-transparent hover:text-white/70'
              }`}
            >
              <FontAwesomeIcon icon={tab.icon} className="text-xs" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-10 pb-6">
        {activeTab === 'songs' && (
          <div>
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/30">
                <FontAwesomeIcon icon={faMusic} className="text-3xl mb-3 opacity-30" />
                <p className="text-sm">播放歌曲后这里会显示播放列表</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-white/40 text-xs">
                    <FontAwesomeIcon icon={faMusic} className="text-[10px]" />
                    <span>播放列表 · {queue.length} 首</span>
                  </div>
                  <button
                    onClick={() => {
                      const songs = queue.filter((_, i) => i !== queueIndex);
                      songs.forEach((s) => playSong(s));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/10 text-cyan-400 text-[11px] font-medium hover:bg-cyan-400/20 transition-colors"
                  >
                    <FontAwesomeIcon icon={faPlay} className="text-[9px]" />
                    <span>播放全部</span>
                  </button>
                </div>
                <div className="space-y-0.5">
                  {queue.map((song, i) => {
                    const isPlaying = currentSong?.id === song.id;
                    return (
                      <div
                        key={`${song.id}-${i}`}
                        onClick={() => playSong(song)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors group ${
                          isPlaying
                            ? 'bg-cyan-400/10 border border-cyan-400/20'
                            : 'hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span className={`w-7 text-center text-[10px] tabular-nums ${
                          isPlaying ? 'text-cyan-400' : 'text-white/20'
                        }`}>
                          {isPlaying ? <FontAwesomeIcon icon={faPlay} className="text-[9px]" /> : i + 1}
                        </span>
                        <img
                          src={(song.al?.picUrl || '') + '?param=60y60'}
                          className="w-9 h-9 rounded-lg object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${isPlaying ? 'text-cyan-400' : 'text-white/80'}`}>{song.name}</p>
                          <p className="text-xs text-white/35 truncate">{song.ar?.map(a => a.name).join(' / ')}</p>
                        </div>
                        <span className="text-[10px] text-white/25 font-mono tabular-nums">{formatDuration(song.dt || 0)}</span>
                        <div onClick={(e) => e.stopPropagation()}>
                          <SongMenu song={song} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'artists' && (
          <div className="grid grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-4 text-center py-20 text-white/30 text-sm">加载中...</div>
            ) : artists.length === 0 ? (
              <div className="col-span-4 flex flex-col items-center justify-center py-20 text-white/30">
                <FontAwesomeIcon icon={faUser} className="text-3xl mb-3 opacity-30" />
                <p className="text-sm">暂无歌手</p>
              </div>
            ) : (
              artists.map((artist) => (
                <div key={artist.id} className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                  <img src={artist.picUrl + '?param=200y200'} className="w-20 h-20 rounded-full object-cover" />
                  <p className="text-xs font-bold text-white text-center truncate w-full">{artist.name}</p>
                  {artist.alias?.[0] && (
                    <p className="text-[10px] text-white/40 text-center truncate w-full">{artist.alias[0]}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'albums' && (
          <div className="grid grid-cols-4 gap-4">
            {loading ? (
              <div className="col-span-4 text-center py-20 text-white/30 text-sm">加载中...</div>
            ) : albums.length === 0 ? (
              <div className="col-span-4 flex flex-col items-center justify-center py-20 text-white/30">
                <FontAwesomeIcon icon={faCompactDisc} className="text-3xl mb-3 opacity-30" />
                <p className="text-sm">暂无专辑</p>
              </div>
            ) : (
              albums.map((album) => (
                <div key={album.id} className="flex flex-col gap-2 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors">
                  <img src={album.picUrl + '?param=300y300'} className="w-full aspect-square rounded-xl object-cover" />
                  <p className="text-xs font-bold text-white truncate">{album.name}</p>
                  <p className="text-[10px] text-white/40 truncate">{album.artist.name}</p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'folders' && (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <FontAwesomeIcon icon={faFolder} className="text-3xl mb-3 opacity-30" />
            <p className="text-sm">暂无文件夹</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MusicLibrary;
