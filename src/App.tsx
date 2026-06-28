import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProviders } from './context';
import { ToastProvider } from './components/Toast';
import { usePlayer } from './context/PlayerContext';
import { useData } from './context/DataContext';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import AppLayout from './layouts/AppLayout';
import type { FC } from 'react';

const AppContent: FC = () => {
  const { audioRef } = usePlayer();
  const { currentSong } = useData();

  useAudioPlayer();
  useKeyboardShortcuts();

  return (
    <>
      <audio ref={audioRef} src={currentSong?.url || undefined} onError={() => {}} />
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App: FC = () => (
  <AppProviders>
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  </AppProviders>
);

export default App;
