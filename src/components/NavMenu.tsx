import type { FC } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faCompactDisc, faLayerGroup, faFire, faGear } from '@fortawesome/free-solid-svg-icons';
import type { NavView } from '../context/types';
import { useI18n } from '../i18n';

interface NavMenuProps {
  active: NavView;
  onChange: (view: NavView) => void;
}

const NavMenu: FC<NavMenuProps> = ({ active, onChange }) => {
  const { t } = useI18n();
  const NAV_ITEMS = [
    { icon: faHouse, label: t('nav.discover'), view: 'discover' as NavView },
    { icon: faCompactDisc, label: t('nav.library'), view: 'library' as NavView },
    { icon: faFire, label: t('nav.leaderboard'), view: 'leaderboard' as NavView },
    { icon: faLayerGroup, label: t('nav.playlists'), view: 'playlists' as NavView },
    { icon: faGear, label: t('nav.settings'), view: 'settings' as NavView },
  ];
  return (
    <nav className="flex-1 space-y-1 relative z-10" aria-label={t('nav.discover')}>
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
