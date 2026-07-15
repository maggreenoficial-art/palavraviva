import * as FileSystem from 'expo-file-system/legacy';
import { useDownloadStore } from '../store/useDownloadStore';
import type { Session } from '../types';
import { isRemoteAudio } from '../utils/audioSource';

const AUDIO_DIR = `${FileSystem.documentDirectory ?? ''}audios/`;

async function ensureAudioDir() {
  const info = await FileSystem.getInfoAsync(AUDIO_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(AUDIO_DIR, { intermediates: true });
  }
}

export async function downloadSessionAudio(session: Session): Promise<string> {
  if (!isRemoteAudio(session.audioSource)) {
    // Áudio empacotado no app — já funciona offline.
    const localUri = `bundled://${session.id}`;
    useDownloadStore.getState().markDownloaded({
      sessionId: session.id,
      localUri,
      downloadedAt: new Date().toISOString(),
    });
    return localUri;
  }

  await ensureAudioDir();

  const localUri = `${AUDIO_DIR}${session.id}.mp3`;
  const existing = await FileSystem.getInfoAsync(localUri);

  if (!existing.exists) {
    const result = await FileSystem.downloadAsync(session.audioSource, localUri);
    if (result.status !== 200) {
      throw new Error('Falha ao baixar o áudio.');
    }
  }

  useDownloadStore.getState().markDownloaded({
    sessionId: session.id,
    localUri,
    downloadedAt: new Date().toISOString(),
  });

  return localUri;
}
