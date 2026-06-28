import type { ReactNode } from 'react';
import { I18nProvider } from '../i18n';
import { AuthProvider } from './AuthContext';
import { DataProvider } from './DataContext';
import { PlayerProvider } from './PlayerContext';
import { MoodProvider } from './MoodContext';

export const AppProviders = ({ children }: { children: ReactNode }) => {
  return (
    <I18nProvider>
      <MoodProvider>
        <AuthProvider>
          <DataProvider>
            <PlayerProvider>
              {children}
            </PlayerProvider>
          </DataProvider>
        </AuthProvider>
      </MoodProvider>
    </I18nProvider>
  );
};
