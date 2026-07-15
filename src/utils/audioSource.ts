import type { AudioSource } from '../types';

export function isRemoteAudio(source: AudioSource): source is string {
  return typeof source === 'string';
}

export function resolvePlaybackSource(
  source: AudioSource,
  downloadedUri?: string,
) {
  if (downloadedUri) {
    return { uri: downloadedUri };
  }
  if (isRemoteAudio(source)) {
    return { uri: source };
  }
  return source;
}
