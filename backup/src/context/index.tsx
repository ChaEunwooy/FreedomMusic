import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { DataProvider } from './DataContext';
import { PlayerProvider } from './PlayerContext';
import { MoodProvider } from './MoodContext';

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <MoodProvider>
      <AuthProvider>
        <DataProvider>
          <PlayerProvider>
            {children}
          </PlayerProvider>
        </DataProvider>
      </AuthProvider>
    </MoodProvider>
  );
};
