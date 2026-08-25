import { DeckGL } from '@deck.gl/react';
import { LinearInterpolator, OrthographicView, type OrthographicViewState } from '@deck.gl/core';
import { GeoJsonLayer, PolygonLayer } from '@deck.gl/layers';
import type { BBox, FeatureCollection, Position } from 'geojson';
import { reprojectGeojson, transformCoordinates } from '../lib/geometry';
import { useEffect, useState } from 'react';
import bbox from '@turf/bbox';
import { loadCells, loadCountries } from '../lib/data_loader';
import { scaleSequential } from 'd3-scale';
import { interpolateViridis } from 'd3-scale-chromatic'; // npm install d3-scale-chromatic
import { color as d3color } from 'd3-color'; // npm install d3-color
import { Flex, Spinner, Text } from '@radix-ui/themes';

const INITIAL_VIEW_STATE : OrthographicViewState = {
  target: [40, -20, 0] as [number, number, number],
  zoom: 0,
  minZoom: 0,
  maxZoom: 5
};

const FOCUS_ZOOM = 3.5;
const FOCUS_TRANSITION_MS = 700;
const FOCUS_INTERPOLATOR = new LinearInterpolator(['target', 'zoom']);

const BBOX_OFFSET = 10.0;


export interface MapData {
  values: Float32Array<ArrayBufferLike>
  bounds: [number, number]
}

export interface DataCell {
  index: number
}

export interface FocusRequest {
  lat: number
  lon: number
  key: number
}


const colorScale = (bounds : [number, number]) => scaleSequential(interpolateViridis).domain(bounds);

const calculateColor = (value: number, bounds: [number, number]): [number, number, number] => {
  const c = d3color(colorScale(bounds)(value))!.rgb();
  return [Math.round(c.r), Math.round(c.g), Math.round(c.b)];
};

/**
 * Renders the reprojected country outlines as a deck.gl choropleth inside an
 * OrthographicView. Point-value overlays are intentionally not rendered yet.
 */
export function WorldMap({data, height, onCellClick, selectedIndex, isDatasetLoading, focusRequest} : {
  data: MapData,
  height: string,
  onCellClick?: (cell: DataCell | null) => void,
  selectedIndex?: number | null,
  isDatasetLoading?: boolean,
  focusRequest?: FocusRequest | null,
}) {
  const [geojson, setGeojson] = useState<FeatureCollection | undefined>(undefined);
  const [cells, setCells] = useState<FeatureCollection | undefined>(undefined);
  const [boundingBox, setBoundingBox] = useState<BBox | undefined>(undefined);
  const [viewState, setViewState] = useState<OrthographicViewState>(INITIAL_VIEW_STATE);

  useEffect(() => {
    if (!focusRequest) return;
    const projected = transformCoordinates(focusRequest.lon, focusRequest.lat);
    if (!projected) return;
    setViewState((prev) => ({
      ...prev,
      target: [projected[0], projected[1], 0],
      zoom: FOCUS_ZOOM,
      transitionDuration: FOCUS_TRANSITION_MS,
      transitionInterpolator: FOCUS_INTERPOLATOR,
    }));
  }, [focusRequest?.key]);

  const isMapLoading = !geojson || !cells;
  const showSpinner = isMapLoading || isDatasetLoading;
  const loadingLabel = "Loading Application Data ...";

  const layers = [
    new GeoJsonLayer({
      id: 'data-layer',
      data: cells,
      filled: true,
      stroked: true,
      pickable: onCellClick != null,
      onClick: onCellClick
        ? (info) => {
            if (info.index >= 0) onCellClick({ index: info.index });
            return true;
          }
        : undefined,
      getLineColor:  [233, 226, 201, 50],
      lineWidthMinPixels: 0.1,
      getLineWidth: 0.1,
      getFillColor: (_, { index }) => {
        if (selectedIndex === index)
          return [224, 182, 88, 255]
        else
          return index < data.values.length && data.values[index] ? [...calculateColor(data.values[index], data.bounds), 255] : [0,0,0,0]
      },
      updateTriggers: {
        getFillColor: [data, selectedIndex],
      },
    }),

    new GeoJsonLayer({
      id: 'choropleth-layer',
      data: geojson,
      filled: false,
      stroked: true,
      getLineColor: [233, 226, 201, 120],
      lineWidthMinPixels: 0.5,
      getLineWidth: 0.1
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
    <div style={{ position: 'relative', width: '100%', height }}>
      <DeckGL
        views={new OrthographicView({ id: 'ortho', controller: {
          maxBounds: boundingBox && [[boundingBox[0] - BBOX_OFFSET,boundingBox[1]- BBOX_OFFSET] ,[boundingBox[2] + BBOX_OFFSET,boundingBox[3] + BBOX_OFFSET]]}
        })}
        viewState={viewState}
        onViewStateChange={({ viewState: next }) => setViewState(next as OrthographicViewState)}
        layers={layers}
        onClick={(info) => {
          if (onCellClick && !info.object) onCellClick(null);
        }}
        style={{ width: '100%', height: height }}
      />
      {showSpinner && (
        <Flex
          align="center"
          justify="center"
          gap="3"
          direction="column"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 30, 25, 0.75)',
            pointerEvents: 'none',
            color: 'var(--text-on-ink-dim)',
          }}
        >
          <Spinner size="3"/>
          <Text size="2" style={{ color: 'var(--text-on-ink-dim)' }}>{loadingLabel}</Text>
        </Flex>
      )}
    </div>
  );
}
