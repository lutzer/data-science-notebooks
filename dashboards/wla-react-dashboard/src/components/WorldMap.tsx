import { DeckGL } from '@deck.gl/react';
import { OrthographicView, type OrthographicViewState } from '@deck.gl/core';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import type { BBox, FeatureCollection, Position } from 'geojson';
import { reprojectGeojson } from '../lib/geometry';
import { useEffect, useState } from 'react';
import bbox from '@turf/bbox';
import { loadCells, loadCountries } from '../lib/data_loader';
import { scaleSequential } from 'd3-scale';
import { interpolateViridis } from 'd3-scale-chromatic'; // npm install d3-scale-chromatic
import { color as d3color } from 'd3-color'; // npm install d3-color
import { dataListLabelPropDefs } from '@radix-ui/themes/src/components/data-list.props.js';

const INITIAL_VIEW_STATE : OrthographicViewState = {
  target: [40, -20, 0] as [number, number, number],
  zoom: 0,
  minZoom: 0,
  maxZoom: 4
};

const BBOX_OFFSET = 10.0;


export interface DataCell {
  x: number;
  y: number;
  polygon: Position[];
  value: number;
}


const colorScale = scaleSequential(interpolateViridis).domain([0.0, 1.0]);

const calculateColor = (value: number): [number, number, number] => {
  const c = d3color(colorScale(value))!.rgb();
  return [Math.round(c.r), Math.round(c.g), Math.round(c.b)];
};

/**
 * Renders the reprojected country outlines as a deck.gl choropleth inside an
 * OrthographicView. Point-value overlays are intentionally not rendered yet.
 */
export function WorldMap({data, height} : { data: number[], height: string }) {
  const [geojson, setGeojson] = useState<FeatureCollection | undefined>(undefined);
  const [cells, setCells] = useState<FeatureCollection | undefined>(undefined);
  const [boundingBox, setBoundingBox] = useState<BBox | undefined>(undefined)

  const layers = [
    new GeoJsonLayer({
      id: 'choropleth-layer',
      data: geojson,
      filled: true,
      stroked: true,
      getFillColor: [0, 0, 0, 0],
      getLineColor: [0, 0, 0, 255],
      lineWidthMinPixels: 0.5,
      getLineWidth: 0.1
    }),
    new GeoJsonLayer({
      id: 'data-layer',
      data: cells,
      filled: true,
      stroked: true,
      // getFillColor: feature => feature.properties.value ? calculateColor(feature.properties.value) : [0,0,0,0],
      getLineColor: [0, 0, 0, 50],
      lineWidthMinPixels: 0.1,
      getLineWidth: 0.1,
      getFillColor: (_, { index }) => {
        return index < data.length && data[index] ? [...calculateColor(data[index]), 255] : [0,0,0,0]
      },
      updateTriggers: {
        getFillColor: [data], // tells deck.gl to recompute colors when `data` changes
      },
    }),
  ];

  useEffect(() => {
      Promise.all([loadCountries(), loadCells()])
        .then(([g, c]) => {
          let projection = reprojectGeojson(g)
          setBoundingBox(bbox(projection, { recompute: true}));
          setGeojson(projection);
          let cellProjection = reprojectGeojson(c)
          setCells(cellProjection)
        })
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
