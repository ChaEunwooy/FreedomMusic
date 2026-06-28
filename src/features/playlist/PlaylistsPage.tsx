import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faPlus, faCompactDisc, faLock, faUser, faTrash, faXmark } from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { createLocalPlaylist, deleteLocalPlaylist } from '../../services/api';
import { formatCount } from '../../utils/format';

interface PlaylistItem {
  id: number;
  name: string;
  picUrl: string;
  playCount?: number;
  trackCount?: number;
}

const PlaylistsPage: FC = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { user, subscribedPlaylists, createdPlaylists, fetchLocalPlaylists } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!user?.id || !newName.trim()) return;
    await createLocalPlaylist(user.id, newName.trim());
    setNewName('');
    setShowCreate(false);
    fetchLocalPlaylists();
  };

  const handleDelete = async (e: React.MouseEvent, playlistId: number) => {
    e.stopPropagation();
    if (!user?.id) return;
    await deleteLocalPlaylist(user.id, playlistId);
    fetchLocalPlaylists();
  };

  const PlaylistCard: FC<{ playlist: PlaylistItem; onDelete?: (id: number) => void }> = ({ playlist, onDelete }) => (
    <div
      className="group cursor-pointer"
      onClick={() => navigate(`/playlist/${playlist.id}`)}
    >
      <div className="aspect-square rounded-[20px] overflow-hidden mb-3 relative shadow-lg border border-white/10 group-hover:border-cyan-400/30 transition-colors duration-200">
        <img
          src={playlist.picUrl ? playlist.picUrl + '?param=400y400' : '/playlist-covers/happy/1.jpg'}
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
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(playlist.id); }}
            className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <FontAwesomeIcon icon={faTrash} className="text-white text-[10px]" />
          </button>
        )}
      </div>
      <p className="text-xs font-bold text-white truncate px-1 leading-tight">{playlist.name}</p>
      {playlist.trackCount !== undefined && (
        <p className="text-[10px] text-white/40 mt-0.5 px-1">{t('playlist.tracks', { count: playlist.trackCount })}</p>
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
      <p className="text-sm text-white/50 mb-1">{t('auth.login_hint')}</p>
      <p className="text-xs text-white/30">{t('auth.login_hint_sub')}</p>
    </div>
  );

  const PlaylistGrid: FC<{ items: PlaylistItem[]; onDelete?: (id: number) => void }> = ({ items, onDelete }) => (
    <div className="grid grid-cols-5 gap-6">
      {items.map((list) => (
        <PlaylistCard key={list.id} playlist={list} onDelete={onDelete} />
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t('playlist.title')}</h1>
          <p className="text-xs text-white/40">{t('playlist.subtitle')}</p>
        </div>
      </div>

      {/* 我喜欢的歌单 */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-5">
          <FontAwesomeIcon icon={faHeart} className="text-rose-400 text-sm" />
          <h2 className="text-lg font-bold text-white">{t('playlist.my_fav')}</h2>
          <span className="text-[10px] text-white/30 ml-1">{t('playlist.fav_count', { count: subscribedPlaylists.length })}</span>
        </div>
        {user ? (
          subscribedPlaylists.length > 0 ? (
            <PlaylistGrid items={subscribedPlaylists} />
          ) : (
            <EmptyHint icon={faHeart} text={t('playlist.no_fav')} sub={t('playlist.fav_hint')} />
          )
        ) : (
          <LoginHint />
        )}
      </section>

      {/* 我创建的歌单 */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <FontAwesomeIcon icon={faUser} className="text-cyan-400 text-sm" />
          <h2 className="text-lg font-bold text-white">{t('playlist.my_created')}</h2>
          <span className="text-[10px] text-white/30 ml-1">{t('playlist.created_count', { count: createdPlaylists.length })}</span>
          {user && (
            <button
              onClick={() => setShowCreate(true)}
              className="ml-2 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} className="text-white/60 text-[10px]" />
            </button>
          )}
        </div>
        {showCreate && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-white/5 rounded-xl">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder={t('playlist.create_placeholder')}
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              autoFocus
            />
            <button onClick={handleCreate} className="px-3 py-1 rounded-lg bg-cyan-400 text-black text-xs font-bold hover:bg-cyan-300 transition-colors">
              {t('create')}
            </button>
            <button onClick={() => { setShowCreate(false); setNewName(''); }} className="w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center">
              <FontAwesomeIcon icon={faXmark} className="text-white/40 text-xs" />
            </button>
          </div>
        )}
        {user ? (
          createdPlaylists.length > 0 ? (
            <PlaylistGrid items={createdPlaylists} onDelete={handleDelete} />
          ) : (
            <EmptyHint icon={faPlus} text={t('playlist.no_created')} sub={t('playlist.create_hint')} />
          )
        ) : (
          <LoginHint />
        )}
      </section>
    </div>
  );
};

export default PlaylistsPage;
