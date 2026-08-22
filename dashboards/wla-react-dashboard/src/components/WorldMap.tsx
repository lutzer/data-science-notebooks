import { DeckGL } from '@deck.gl/react';
import { OrthographicView, type OrthographicViewState } from '@deck.gl/core';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { BBox, FeatureCollection } from 'geojson';
import { reprojectGeojson } from '../lib/projection';
import { useEffect, useState } from 'react';
import bbox from '@turf/bbox';
import { loadCountries } from '../lib/data_loader';

  const INITIAL_VIEW_STATE : OrthographicViewState = {
    target: [40, -20, 0] as [number, number, number],
    zoom: 0,
    minZoom: 0,
    maxZoom: 4
  };

  const BBOX_OFFSET = 10.0;

/**
 * Renders the reprojected country outlines as a deck.gl choropleth inside an
 * OrthographicView. Point-value overlays are intentionally not rendered yet.
 */
export function WorldMap({height} : { height: string }) {
  const [geojson, setGeojson] = useState<FeatureCollection | undefined>(undefined);
  const [boundingBox, setBoundingBox] = useState<BBox | undefined>(undefined)

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
        .then(([g]) => {
          let projection = reprojectGeojson(g)
          setBoundingBox(bbox(projection, { recompute: true}));
          setGeojson(projection);
        })
        // .catch((e: unknown) => setError(String(e)));
    }, []);

  return (
    <DeckGL
      views={new OrthographicView({ id: 'ortho', controller: {
        maxBounds: boundingBox && [[boundingBox[0] - BBOX_OFFSET,boundingBox[1]- BBOX_OFFSET] ,[boundingBox[2] + BBOX_OFFSET,boundingBox[3] + BBOX_OFFSET]]} 
      })}
      initialViewState={INITIAL_VIEW_STATE}
      layers={layers}
      style={{ width: '100%', height: height, border: "1px solid black" }}
    />
  );
}
