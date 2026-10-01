import { TerritoryMap } from './paint';

export function paintImageData(map: TerritoryMap): ImageData {
  const n = map.resolution, data = new Uint8ClampedArray(n * n * 4);
  for (let i = 0; i < map.owners.length; i++) {
    const p = i * 4, owner = map.owners[i];
    if (owner < 4) { data[p] = map.pixels[p]; data[p + 1] = map.pixels[p + 1]; data[p + 2] = map.pixels[p + 2]; }
    else if (owner === 254) { data[p] = 39; data[p + 1] = 67; data[p + 2] = 60; }
    else { data[p] = 232; data[p + 1] = 223; data[p + 2] = 197; }
    data[p + 3] = 255;
  }
  return new ImageData(data, n, n);
}
export function paintSnapshot(map: TerritoryMap) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = map.resolution;
  canvas.getContext('2d')!.putImageData(paintImageData(map), 0, 0);
  return canvas.toDataURL('image/png');
}