import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faCompactDisc, faLayerGroup, faFire, faGear } from '@fortawesome/free-solid-svg-icons';
import type { NavView } from '../context/types';

interface NavMenuProps {
  active: NavView;
  onChange: (view: NavView) => void;
}

const NAV_ITEMS = [
  { icon: faHouse, label: '发现', view: 'discover' as NavView },
  { icon: faCompactDisc, label: '音乐库', view: 'library' as NavView },
  { icon: faFire, label: '排行榜', view: 'leaderboard' as NavView },
  { icon: faLayerGroup, label: '歌单', view: 'playlists' as NavView },
  { icon: faGear, label: '设置', view: 'settings' as NavView },
];

const NavMenu: FC<NavMenuProps> = ({ active, onChange }) => {
  return (
    <nav className="flex-1 space-y-1 relative z-10" aria-label="主导航">
      {NAV_ITEMS.map((item) => {
        const isActive = active === item.view;
        return (
          <button
            key={item.label}
            onClick={() => onChange(item.view)}
            tabIndex={0}
            className={`w-full flex items-center gap-4 p-3 cursor-pointer transition-all duration-300 rounded-2xl text-left ${
              isActive
                ? 'text-white font-bold clear-glass-card'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            <FontAwesomeIcon icon={item.icon} className={`w-5 text-center ${isActive ? 'text-cyan-400' : ''}`} />
            <span className="text-sm">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default NavMenu;
