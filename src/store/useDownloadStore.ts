import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DownloadState } from '../types';

interface DownloadStore {
  downloads: Record<string, DownloadState>;
  markDownloaded: (download: DownloadState) => void;
  removeDownload: (sessionId: string) => void;
  isDownloaded: (sessionId: string) => boolean;
  getLocalUri: (sessionId: string) => string | undefined;
}

export const useDownloadStore = create<DownloadStore>()(
  persist(
    (set, get) => ({
      downloads: {},
      markDownloaded: (download) =>
        set((state) => ({
          downloads: { ...state.downloads, [download.sessionId]: download },
        })),
      removeDownload: (sessionId) =>
        set((state) => {
          const next = { ...state.downloads };
          delete next[sessionId];
          return { downloads: next };
        }),
      isDownloaded: (sessionId) => Boolean(get().downloads[sessionId]),
      getLocalUri: (sessionId) => get().downloads[sessionId]?.localUri,
    }),
    {
      name: 'palavra-viva-downloads',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
