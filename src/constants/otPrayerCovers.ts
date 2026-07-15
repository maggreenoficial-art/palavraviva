const coverRequires: Record<string, number> = {
  'ot-salmo-23': require('../../assets/thumbnails/ot-salmo-23.png'),
  'ot-salmo-51': require('../../assets/thumbnails/ot-salmo-51.png'),
  'ot-salomao-templo': require('../../assets/thumbnails/ot-salomao-templo.png'),
  'ot-ana': require('../../assets/thumbnails/ot-ana.png'),
  'ot-elias-carmelo': require('../../assets/thumbnails/ot-elias-carmelo.png'),
  'ot-jabez': require('../../assets/thumbnails/ot-jabez.png'),
  'ot-daniel-9': require('../../assets/thumbnails/ot-daniel-9.png'),
  'ot-jonas': require('../../assets/thumbnails/ot-jonas.png'),
  'ot-habacuque': require('../../assets/thumbnails/ot-habacuque.png'),
  'ot-moises': require('../../assets/thumbnails/ot-moises.png'),
};

export function getOtPrayerCoverImage(id: string): number {
  const image = coverRequires[id];
  if (image == null) {
    throw new Error(`Capa ausente para oração OT: ${id}`);
  }
  return image;
}
