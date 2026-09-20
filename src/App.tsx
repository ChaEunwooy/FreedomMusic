import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProviders } from './context';
import { ToastProvider, useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { usePlayer } from './context/PlayerContext';
import { useData } from './context/DataContext';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import AppLayout from './layouts/AppLayout';
import type { FC } from 'react';

const AppContent: FC = () => {
  const { audioRef } = usePlayer();
  const { currentSong } = useData();
  const { toast } = useToast();

  useAudioPlayer();
  useKeyboardShortcuts();

  const handleAudioError = () => {
    if (currentSong?.name) {
      toast(`歌曲《${currentSong.name}》播放源失效或网络异常`, 'error');
    }
  };

  return (
    <ErrorBoundary fallbackTitle="播放器核心遇到异常">
      <audio ref={audioRef} src={currentSong?.url || undefined} onError={handleAudioError} />
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<AppLayout />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

const App: FC = () => (
  <ErrorBoundary fallbackTitle="FreedomMusic 初始化异常">
    <AppProviders>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AppProviders>
  </ErrorBoundary>
);

export default App;
