import type { FC } from 'react';

const Logo: FC = () => (
  <div className="flex items-center gap-3 mb-14 px-2 relative z-10">
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.5)]" />
    <span className="text-xl font-bold tracking-tight text-white">Aurora</span>
  </div>
);

export default Logo;
