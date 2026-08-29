import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faCheck, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { useI18n } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { addTrackToPlaylist, addTracksToLocalPlaylist, getSongDetail } from '../../services/api';

interface AddToPlaylistModalProps {
  open: boolean;
  onClose: () => void;
  trackIds: number[];
}

const AddToPlaylistModal: FC<AddToPlaylistModalProps> = ({ open, onClose, trackIds }) => {
  const { t } = useI18n();
  const { createdPlaylists, subscribedPlaylists, user, fetchLocalPlaylists } = useAuth();
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
      const isLocal = createdPlaylists.some(p => p.id === selectedId);
      if (isLocal && user?.id) {
        const detailRes = await getSongDetail(trackIds);
        const tracks = (detailRes.data.songs || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          ar: s.ar || [],
          al: s.al || { picUrl: '' },
          dt: s.dt || 0,
        }));
        await addTracksToLocalPlaylist(user.id, selectedId, tracks);
        fetchLocalPlaylists();
      } else {
        await addTrackToPlaylist(selectedId, trackIds);
      }
      setSuccess(true);
      setTimeout(onClose, 800);
    } catch {
      setError(t('add_to_playlist.failed'));
    } finally {
      setLoading(false);
    }
  }, [selectedId, trackIds, onClose, user, createdPlaylists, fetchLocalPlaylists, t]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-[340px] rounded-2xl p-5 clear-glass flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-white">{t('add_to_playlist.title')}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        </div>

        {success ? (
          <div className="flex items-center justify-center gap-2 py-8">
            <FontAwesomeIcon icon={faCheck} className="text-green-400" />
            <span className="text-sm text-green-400">{t('add_to_playlist.success')}</span>
          </div>
        ) : (
          <>
            <div className="max-h-[240px] overflow-y-auto no-scrollbar space-y-1 mb-4">
              {allPlaylists.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">{t('add_to_playlist.empty')}</p>
              ) : (
                allPlaylists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => setSelectedId(pl.id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                      selectedId === pl.id ? 'bg-cyan-400/10 border border-cyan-400/20' : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <img src={pl.picUrl ? pl.picUrl + '?param=80y80' : ''} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm text-white/80 truncate">{pl.name}</p>
                      <p className="text-[10px] text-white/35">{t('playlist.tracks', { count: pl.trackCount })}</p>
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
              <span>{loading ? t('add_to_playlist.adding') : t('confirm')}</span>
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AddToPlaylistModal;
