import type { AudioSource } from '../types';
import { oldTestamentPrayers } from './oldTestamentPrayers';

/**
 * Narrações das 10 orações do VT.
 * Geradas com npm run generate:ot-prayers.
 */
const audioRequires: Record<string, number> = {
  'ot-salmo-23': require('../../assets/audio/ot/ot-salmo-23.mp3'),
  'ot-salmo-51': require('../../assets/audio/ot/ot-salmo-51.mp3'),
  'ot-salomao-templo': require('../../assets/audio/ot/ot-salomao-templo.mp3'),
  'ot-ana': require('../../assets/audio/ot/ot-ana.mp3'),
  'ot-elias-carmelo': require('../../assets/audio/ot/ot-elias-carmelo.mp3'),
  'ot-jabez': require('../../assets/audio/ot/ot-jabez.mp3'),
  'ot-daniel-9': require('../../assets/audio/ot/ot-daniel-9.mp3'),
  'ot-jonas': require('../../assets/audio/ot/ot-jonas.mp3'),
  'ot-habacuque': require('../../assets/audio/ot/ot-habacuque.mp3'),
  'ot-moises': require('../../assets/audio/ot/ot-moises.mp3'),
};

export function getOtPrayerAudioSource(otId: string): AudioSource | undefined {
  return audioRequires[otId];
}

export function listOtPrayerAudioIds() {
  return oldTestamentPrayers.map((item) => item.id);
}
