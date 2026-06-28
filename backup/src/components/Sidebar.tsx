import type { FC } from 'react';
import Logo from './Logo';
import NavMenu from './NavMenu';
import type { NavView } from '../context/types';
import UserInfo from '../features/auth/UserInfo';

interface SidebarProps {
  activeView: NavView;
  onNavChange: (view: NavView) => void;
}

const Sidebar: FC<SidebarProps> = ({ activeView, onNavChange }) => {
  return (
    <aside className="w-[18%] flex flex-col p-6 clear-glass-sidebar overflow-hidden">
      <Logo />
      <NavMenu active={activeView} onChange={onNavChange} />
      <UserInfo />
    </aside>
  );
};

export default Sidebar;
