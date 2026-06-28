import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart } from '@fortawesome/free-solid-svg-icons';
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons';
import { likeSong, getUserAccount } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n';

interface LikeButtonProps {
  songId: number;
  size?: 'sm' | 'md';
}

const LikeButton: FC<LikeButtonProps> = ({ songId, size = 'md' }) => {
  const { authState } = useAuth();
  const { t } = useI18n();
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  const iconSize = size === 'sm' ? 'text-xs' : 'text-base';

  useEffect(() => {
    if (authState !== 'authed') return;
    getUserAccount().then((res) => {
      const profile = res.data.profile;
      if (profile?.userId) {
        const uid = String(profile.userId);
        const likedKey = `liked_songs_${uid}`;
        const cached = localStorage.getItem(likedKey);
        if (cached) {
          const likedIds: string[] = JSON.parse(cached);
          setLiked(likedIds.includes(String(songId)));
        }
      }
    }).catch(() => {});
  }, [songId, authState]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (authState !== 'authed' || loading) return;
    setLoading(true);
    try {
      await likeSong(songId, !liked);
      setLiked(!liked);
    } catch {
      // like failed
    }
    setLoading(false);
  };

  return (
    <FontAwesomeIcon
      icon={liked ? faHeart : faHeartRegular}
      onClick={toggleLike}
      className={`${iconSize} cursor-pointer transition-all ${
        liked ? 'text-red-400 hover:text-red-300' : 'text-white/30 hover:text-red-400'
      } ${loading ? 'opacity-50' : ''}`}
      aria-label={liked ? t('menu.unlike') : t('menu.like')}
    />
  );
};

export default LikeButton;
