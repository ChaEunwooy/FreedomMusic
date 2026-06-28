import { useState, useEffect, useCallback } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import { addTrackToPlaylist } from '../../services/api';

interface AddToPlaylistModalProps {
  open: boolean;
  onClose: () => void;
  trackIds: number[];
}

const AddToPlaylistModal: FC<AddToPlaylistModalProps> = ({ open, onClose, trackIds }) => {
  const { createdPlaylists, subscribedPlaylists } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const allPlaylists = [...createdPlaylists, ...subscribedPlaylists];

  useEffect(() => {
    if (open) {
      setSelectedId(null);
      setSuccess(false);
      setError('');
    }
  }, [open]);

  const handleAdd = useCallback(async () => {
    if (!selectedId || !trackIds.length) return;
    setLoading(true);
    setError('');
    try {
      await addTrackToPlaylist(selectedId, trackIds);
      setSuccess(true);
      setTimeout(onClose, 800);
    } catch {
      setError('添加失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [selectedId, trackIds, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-[340px] rounded-2xl p-5 clear-glass flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">添加到歌单</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        </div>

        {success ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <FontAwesomeIcon icon={faCheck} className="text-green-400" />
            <span className="text-sm text-green-400">添加成功</span>
          </div>
        ) : (
          <>
            <div className="max-h-[240px] overflow-y-auto no-scrollbar space-y-1 mb-4">
              {allPlaylists.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">暂无歌单</p>
              ) : (
                allPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => setSelectedId(pl.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                      selectedId === pl.id ? 'bg-cyan-400/10 border border-cyan-400/20' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <img src={pl.picUrl + '?param=80y80'} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm text-white/80 truncate">{pl.name}</p>
                      <p className="text-[10px] text-white/35">{pl.trackCount} 首</p>
                    </div>
                    {selectedId === pl.id && <FontAwesomeIcon icon={faCheck} className="text-cyan-400 text-xs" />}
                  </button>
                ))
              )}
            </div>

            {error && <p className="text-xs text-red-400 mb-3 text-center">{error}</p>}

            <button
              onClick={handleAdd}
              disabled={!selectedId || loading}
              className="w-full py-2.5 rounded-xl bg-cyan-400 text-black text-sm font-bold disabled:opacity-40 hover:bg-cyan-300 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : null}
              <span>{loading ? '添加中...' : '确定'}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
