import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';

const SHARE_MESSAGE =
  'Gerei minha Foto com Jesus no app Palavra Viva — ficou linda! Faça a sua também na aba Ferramentas. 💛';

function bufferToBase64(bytes: Uint8Array): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    output += chars[(bitmap >> 18) & 63];
    output += chars[(bitmap >> 12) & 63];
    output += i + 1 < bytes.length ? chars[(bitmap >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? chars[bitmap & 63] : '=';
  }
  return output;
}

/** Baixa a imagem remota e devolve data URI (para guardar no aparelho). */
export async function cacheImageAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const mime = blob.type || 'image/jpeg';

    if (Platform.OS === 'web') {
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result || '');
          resolve(result || null);
        };
        reader.onerror = () => reject(new Error('Falha ao ler imagem'));
        reader.readAsDataURL(blob);
      });
    }

    const buffer = await blob.arrayBuffer();
    const base64 = bufferToBase64(new Uint8Array(buffer));
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

function filename() {
  return `foto-com-jesus-${Date.now()}.jpg`;
}

/** Dispara download no aparelho / navegador. */
export async function downloadFotoJesusImage(source: string): Promise<void> {
  if (!source) throw new Error('Imagem indisponível para baixar.');

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = source;
    a.download = filename();
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  let fileUri = source;
  if (source.startsWith('http')) {
    const dest = `${FileSystem.cacheDirectory ?? ''}${filename()}`;
    const result = await FileSystem.downloadAsync(source, dest);
    if (result.status !== 200) {
      throw new Error('Não foi possível baixar a imagem.');
    }
    fileUri = result.uri;
  } else if (source.startsWith('data:')) {
    const dest = `${FileSystem.cacheDirectory ?? ''}${filename()}`;
    const base64 = source.replace(/^data:image\/\w+;base64,/, '');
    await FileSystem.writeAsStringAsync(dest, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    fileUri = dest;
  }

  await Share.share({
    url: fileUri,
    message: 'Minha Foto com Jesus — Palavra Viva',
  });
}

/** Compartilha convite para uma amiga. */
export async function shareFotoJesusInvite() {
  try {
    await Share.share({ message: SHARE_MESSAGE });
  } catch {
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.share
    ) {
      await navigator.share({ text: SHARE_MESSAGE });
      return;
    }
    if (
      Platform.OS === 'web' &&
      typeof navigator !== 'undefined' &&
      navigator.clipboard
    ) {
      await navigator.clipboard.writeText(SHARE_MESSAGE);
      return;
    }
    await Linking.openURL(
      `https://wa.me/?text=${encodeURIComponent(SHARE_MESSAGE)}`,
    );
  }
}
