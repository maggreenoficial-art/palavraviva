export type Feeling = 'ansioso' | 'sobrecarregado' | 'triste';

export type SessionCategory =
  | 'manha'
  | 'noite'
  | 'sos'
  | 'jornada'
  | 'reflexao'
  | 'serie';

/** Fonte local (require) ou URI remota */
export type AudioSource = number | string;

export type FavoriteKind = 'prayer' | 'session';

export interface FavoriteItem {
  id: string;
  kind: FavoriteKind;
  createdAt: string;
}

export interface Session {
  id: string;
  title: string;
  subtitle: string;
  /** Texto instrucional/devocional — NÃO é versículo bíblico */
  summary: string;
  category: SessionCategory;
  durationSeconds: number;
  audioSource: AudioSource;
  ambientSource?: AudioSource;
  /**
   * Id do arquivo de ambiente em assets/audio/ambient/{id}.mp3
   * Quando omisso, usa o próprio session.id.
   */
  ambientMediaKey?: string;
  /** Volume padrão do ambiente (0–1). Padrão: 0.15 */
  ambientVolume?: number;
  /** ID principal de passagem no dataset */
  biblicalPrayerId?: string;
  /** Passagens adicionais do dataset (marcadores da jornada) */
  biblicalPrayerIds?: string[];
  /** Dia da jornada (1–7), se aplicável */
  journeyDay?: number;
  /** Identificador da série (eco, paz, resiliencia, …) */
  seriesId?: string;
  /** Título da série para UI */
  seriesTitle?: string;
  coverColor: string;
  /** Miniatura local (require) */
  coverImage?: number;
}

export interface DownloadState {
  sessionId: string;
  localUri: string;
  downloadedAt: string;
}

export type CheckInScore = 1 | 2 | 3 | 4 | 5;

export interface CheckInEntry {
  id: string;
  sessionId: string;
  before?: CheckInScore;
  after?: CheckInScore;
  createdAt: string;
  updatedAt: string;
}
