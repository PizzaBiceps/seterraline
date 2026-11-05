import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { feature } from 'topojson-client';
const atlas = JSON.parse(await readFile('node_modules/world-atlas/countries-50m.json', 'utf8'));
const metadata = JSON.parse(await readFile('node_modules/world-countries/countries.json', 'utf8'));
const grouped = new Map();
const round = coordinates => typeof coordinates === 'number' ? Math.round(coordinates * 1000) / 1000 : coordinates.map(round);
for (const f of feature(atlas, atlas.objects.countries).features) {
  if (f.id === '010') continue;
  const id = f.id ?? `ne:${f.properties.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const info = metadata.find(c => c.ccn3 === f.id);
  const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const existing = grouped.get(id);
  if (existing) existing.geometry.coordinates.push(...round(polygons));
  else grouped.set(id, { type: 'Feature', id, geometry: { type: 'MultiPolygon', coordinates: round(polygons) }, properties: { name: info?.name.common ?? f.properties.name, iso: info?.cca2.toLowerCase() ?? '', region: info?.region ?? 'Other', independent: info?.independent ?? false } });
}
const countries = [...grouped.values()];
await mkdir('public/data', { recursive: true }); await mkdir('public/flags', { recursive: true });
for (const c of countries) if (c.properties.iso) await copyFile(`node_modules/flag-icons/flags/4x3/${c.properties.iso}.svg`, `public/flags/${c.properties.iso}.svg`);
await writeFile('public/data/countries.json', JSON.stringify({ type: 'FeatureCollection', features: countries }));
console.log(`Prepared ${countries.length} unique country geometries, ${countries.filter(c => c.properties.independent).length} quiz countries, and local SVG flags.`);
