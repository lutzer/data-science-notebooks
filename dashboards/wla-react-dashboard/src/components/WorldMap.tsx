import { DeckGL } from '@deck.gl/react';
import { OrthographicView } from '@deck.gl/core';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { FeatureCollection } from 'geojson';
import { reprojectGeojson } from '../lib/projection';
import { useEffect, useState } from 'react';

const INITIAL_VIEW_STATE = {
  target: [40, -20, 0] as [number, number, number],
  zoom: 0.3,
};

const COUNTRIES_URL = 'public/ne_110m_admin_0_countries.geojson';

/**
 * Fetch the Natural Earth 110m country polygons, drop Antarctica (matching
 * the Python prototype) and reproject the whole FeatureCollection.
 */
async function loadCountries(): Promise<FeatureCollection> {
  const res = await fetch(COUNTRIES_URL);
  if (!res.ok) {
    throw new Error(`failed to fetch countries geojson: ${res.status}`);
  }
  const raw: FeatureCollection = await res.json();
  raw.features = raw.features.filter(
    (f) => f.properties?.ADMIN !== 'Antarctica',
  );
  return reprojectGeojson(raw);
}

/**
 * Renders the reprojected country outlines as a deck.gl choropleth inside an
 * OrthographicView. Point-value overlays are intentionally not rendered yet.
 */
export function WorldMap() {
  const [geojson, setGeojson] = useState<FeatureCollection | undefined>(undefined);

  const layers = [
    new GeoJsonLayer({
      id: 'choropleth-layer',
      data: geojson,
      filled: true,
      stroked: true,
      getFillColor: [0, 0, 0, 10],
      getLineColor: [0, 0, 0, 255],
      lineWidthMinPixels: 0.5,
      getLineWidth: 0.1
    }),
  ];

  useEffect(() => {
      Promise.all([loadCountries()])
        .then(([g, r]) => {
          setGeojson(g);
        })
        // .catch((e: unknown) => setError(String(e)));
    }, []);

  return (
    <DeckGL
      views={new OrthographicView({ id: 'ortho', controller: true })}
      initialViewState={INITIAL_VIEW_STATE}
      layers={layers}
      style={{ width: '100%', height: '500px', border: "1px solid black" }}
    />
  );
}
