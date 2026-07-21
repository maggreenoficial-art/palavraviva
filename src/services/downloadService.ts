import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useDownloadStore } from '../store/useDownloadStore';
import type { Session } from '../types';
import { isRemoteAudio } from '../utils/audioSource';

const AUDIO_DIR = `${FileSystem.documentDirectory ?? ''}audios/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
  }
}

/**
 * Download offline desativado no web (anti-clonagem).
 * No nativo, só faz sentido para fontes remotas já autorizadas.
 */
export async function downloadSessionAudio(session: Session): Promise<string> {
  if (Platform.OS === 'web') {
    throw new Error(
      'Download de áudio não está disponível no site. Use o player com streaming seguro.',
    );
  }

  if (!isRemoteAudio(session.audioSource)) {
    useDownloadStore.getState().markDownloaded({
      sessionId: session.id,
      localUri: String(session.audioSource),
      downloadedAt: new Date().toISOString(),
    });
    return String(session.audioSource);
  }

  await ensureDir();
  const localUri = `${AUDIO_DIR}${session.id}.mp3`;
  const existing = await FileSystem.getInfoAsync(localUri);
  if (!existing.exists) {
    const result = await FileSystem.downloadAsync(session.audioSource, localUri);
    if (result.status !== 200) {
      throw new Error('Falha ao baixar áudio.');
    }
  }

  useDownloadStore.getState().markDownloaded({
    sessionId: session.id,
    localUri,
    downloadedAt: new Date().toISOString(),
  });
  return localUri;
}

export function isOfflineDownloadEnabled() {
  return Platform.OS !== 'web';
}
