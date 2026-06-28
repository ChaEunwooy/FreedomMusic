import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProviders } from './context';
import { usePlayer } from './context/PlayerContext';
import { useData } from './context/DataContext';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import AppLayout from './layouts/AppLayout';
import type { FC } from 'react';

const AppContent: FC = () => {
  const { audioRef } = usePlayer();
  const { currentSong } = useData();

  useAudioPlayer();

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
    <AppContent />
  </AppProviders>
);

export default App;
