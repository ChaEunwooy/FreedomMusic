import { useState, type FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronUp, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import LoginModal from './LoginModal';

const UserInfo: FC = () => {
  const { user, authState, logout } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  const isAuthed = authState === 'authed';

  if (!isAuthed) {
    return (
      <>
        <div
          onClick={() => setShowLogin(true)}
          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all duration-300 border border-white/10 hover:border-white/20 relative z-10"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400/30 to-blue-500/30 border border-white/20 shadow-lg flex items-center justify-center">
            <span className="text-sm text-white/60">?</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white/60 truncate">
              点击登录
            </p>
          </div>
          <FontAwesomeIcon icon={faChevronUp} className="text-white/40 text-xs" />
        </div>
        <LoginModal open={showLogin} onClose={() => setShowLogin(false)} />
      </>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all duration-300 border border-white/10 hover:border-white/20 relative z-10">
      <img
        src={user?.avatar}
        className="w-10 h-10 rounded-full object-cover border border-white/20 shadow-lg"
        alt="avatar"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{user?.nickname}</p>
      </div>
      <FontAwesomeIcon
        icon={faRightFromBracket}
        className="text-white/30 hover:text-red-400 text-xs transition-colors cursor-pointer"
        onClick={(e) => { e.stopPropagation(); logout(); }}
        title="退出登录"
      />
    </div>
  );
};

export default UserInfo;
