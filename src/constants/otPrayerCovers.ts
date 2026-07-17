const coverRequires: Record<string, number> = {
  'ot-salmo-23': require('../../assets/thumbnails/ot-salmo-23.jpg'),
  'ot-salmo-51': require('../../assets/thumbnails/ot-salmo-51.jpg'),
  'ot-salomao-templo': require('../../assets/thumbnails/ot-salomao-templo.jpg'),
  'ot-ana': require('../../assets/thumbnails/ot-ana.jpg'),
  'ot-elias-carmelo': require('../../assets/thumbnails/ot-elias-carmelo.jpg'),
  'ot-jabez': require('../../assets/thumbnails/ot-jabez.jpg'),
  'ot-daniel-9': require('../../assets/thumbnails/ot-daniel-9.jpg'),
  'ot-jonas': require('../../assets/thumbnails/ot-jonas.jpg'),
  'ot-habacuque': require('../../assets/thumbnails/ot-habacuque.jpg'),
  'ot-moises': require('../../assets/thumbnails/ot-moises.jpg'),
};

export function getOtPrayerCoverImage(id: string): number {
  const image = coverRequires[id];
  if (image == null) {
    throw new Error(`Capa ausente para oração OT: ${id}`);
  }
  return image;
}
