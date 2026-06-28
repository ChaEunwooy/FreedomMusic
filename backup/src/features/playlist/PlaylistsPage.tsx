import { useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faPlus, faCompactDisc, faLock, faUser } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { formatCount } from '../../utils/format';

interface PlaylistItem {
  id: number;
  name: string;
  picUrl: string;
  playCount?: number;
  trackCount?: number;
}

const PlaylistsPage: FC = () => {
  const navigate = useNavigate();
  const { user, subscribedPlaylists, createdPlaylists } = useAuth();

  const PlaylistCard: FC<{ playlist: PlaylistItem }> = ({ playlist }) => (
    <div
      className="group cursor-pointer"
      onClick={() => navigate(`/playlist/${playlist.id}`)}
    >
      <div className="aspect-square rounded-[20px] overflow-hidden mb-3 relative shadow-lg border border-white/10 group-hover:border-cyan-400/30 transition-colors duration-200">
        <img
          src={playlist.picUrl + '?param=400y400'}
          className="w-full h-full object-cover"
          alt={playlist.name}
        />
        <div className="absolute inset-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white/80 rounded-tl-sm" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white/80 rounded-tr-sm" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white/80 rounded-bl-sm" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white/80 rounded-br-sm" />
        </div>
        {playlist.playCount !== undefined && playlist.playCount > 0 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-sm text-[10px] text-white/90 font-medium">
            ▶ {formatCount(playlist.playCount)}
          </div>
        )}
      </div>
      <p className="text-xs font-bold text-white truncate px-1 leading-tight">{playlist.name}</p>
      {playlist.trackCount !== undefined && (
        <p className="text-[10px] text-white/40 mt-0.5 px-1">{playlist.trackCount} 首</p>
      )}
    </div>
  );

  const EmptyHint: FC<{ icon: typeof faHeart; text: string; sub?: string }> = ({ icon, text, sub }) => (
    <div className="flex flex-col items-center justify-center py-12 text-white/30">
      <FontAwesomeIcon icon={icon} className="text-3xl mb-3 opacity-20" />
      <p className="text-sm">{text}</p>
      {sub && <p className="text-xs mt-1">{sub}</p>}
    </div>
  );

  const LoginHint: FC = () => (
    <div className="flex flex-col items-center justify-center py-12 clear-glass rounded-2xl border border-white/5">
      <FontAwesomeIcon icon={faLock} className="text-3xl text-white/20 mb-4" />
      <p className="text-sm text-white/50 mb-1">登录后查看你的歌单</p>
      <p className="text-xs text-white/30">同步网易云音乐收藏</p>
    </div>
  );

  const PlaylistGrid: FC<{ items: PlaylistItem[] }> = ({ items }) => (
    <div className="grid grid-cols-5 gap-6">
      {items.map((list) => (
        <PlaylistCard key={list.id} playlist={list} />
      ))}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar p-8 pb-20">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center border border-cyan-400/20">
          <FontAwesomeIcon icon={faCompactDisc} className="text-cyan-400 text-lg" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">歌单</h1>
          <p className="text-xs text-white/40">管理你的音乐收藏</p>
        </div>
      </div>

      {/* 我喜欢的歌单 */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <FontAwesomeIcon icon={faHeart} className="text-rose-400 text-sm" />
          <h2 className="text-lg font-bold text-white">我喜欢的歌单</h2>
          <span className="text-[10px] text-white/30 ml-1">{subscribedPlaylists.length} 个</span>
        </div>
        {user ? (
          subscribedPlaylists.length > 0 ? (
            <PlaylistGrid items={subscribedPlaylists} />
          ) : (
            <EmptyHint icon={faHeart} text="暂无收藏的歌单" sub="去发现页收藏你喜欢的音乐吧" />
          )
        ) : (
          <LoginHint />
        )}
      </section>

      {/* 我创建的歌单 */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <FontAwesomeIcon icon={faUser} className="text-cyan-400 text-sm" />
          <h2 className="text-lg font-bold text-white">我创建的歌单</h2>
          <span className="text-[10px] text-white/30 ml-1">{createdPlaylists.length} 个</span>
        </div>
        {user ? (
          createdPlaylists.length > 0 ? (
            <PlaylistGrid items={createdPlaylists} />
          ) : (
            <EmptyHint icon={faPlus} text="还没有创建歌单" sub="在网易云音乐中创建你的专属歌单" />
          )
        ) : (
          <LoginHint />
        )}
      </section>
    </div>
  );
};

export default PlaylistsPage;
