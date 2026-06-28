import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComment, faThumbsUp } from '@fortawesome/free-solid-svg-icons';
import { getComments } from '../services/api';

interface Comment {
  commentId: number;
  content: string;
  user: { nickname: string; avatarUrl: string };
  likedCount: number;
  time: number;
}

interface CommentSectionProps {
  id: number;
  type?: number;
}

const CommentSection: FC<CommentSectionProps> = ({ id, type = 0 }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getComments(id, type, 20).then((res) => {
      setComments(res.data.comments || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, type]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-4">
        <FontAwesomeIcon icon={faComment} className="text-cyan-400 text-sm" />
        <span className="text-sm font-bold text-white">评论 ({comments.length})</span>
      </div>

      {loading ? (
        <div className="text-center py-8 text-white/30 text-sm">加载中...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-white/30 text-sm">暂无评论</div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.commentId} className="flex gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors">
              <img
                src={comment.user.avatarUrl + '?param=60y60'}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white/70">{comment.user.nickname}</span>
                  <span className="text-[10px] text-white/30">{formatTime(comment.time)}</span>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">{comment.content}</p>
                {comment.likedCount > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <FontAwesomeIcon icon={faThumbsUp} className="text-[10px] text-white/30" />
                    <span className="text-[10px] text-white/30">{comment.likedCount}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentSection;
