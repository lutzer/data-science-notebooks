import { useEffect, useMemo, useRef } from 'react';
import { DeckGL } from '@deck.gl/react';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';

interface SatelliteMapProps {
  longitude?: number;
  latitude?: number;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  width?: number | string;
  height?: number | string;
  layers?: Layer[];
  interactable? : boolean
}

/**
 * Renders a small satellite basemap using Esri World Imagery tiles served over
 * the public ArcGIS REST endpoint (no key, no signup). The component is
 * self-contained: it sizes itself via the `width`/`height` props and overlays
 * the required attribution.
 */
export default function SatelliteMap({
  longitude = 7.4653, // Dortmund
  latitude = 51.5136,
  zoom = 11,
  pitch = 0,
  bearing = 0,
  width = 400,
  height = 300,
  layers = [],
  interactable = false,
}: SatelliteMapProps) {
  const satelliteLayer = useMemo(
    () =>
      new TileLayer({
        id: 'esri-satellite',
        // Esri uses {z}/{y}/{x} order, not the usual {z}/{x}/{y}
        data: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        minZoom: 0,
        maxZoom: 19,
        tileSize: 256,
        renderSubLayers: (props) => {
          const { boundingBox } = props.tile;
          return new BitmapLayer(props, {
            data: undefined,
            image: props.data,
            bounds: [
              boundingBox[0][0],
              boundingBox[0][1],
              boundingBox[1][0],
              boundingBox[1][1],
            ],
          });
        },
      }),
    []
  );

  return (
    <div style={{ position: 'relative', width, height }}>
      <DeckGL
        initialViewState={{ longitude, latitude, zoom, pitch, bearing }}
        controller={interactable}
        layers={[satelliteLayer, ...layers]}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 8,
          fontSize: 11,
          color: '#fff',
          textShadow: '0 0 2px rgba(0,0,0,0.8)',
          pointerEvents: 'none',
        }}
      >
        Tiles © Esri
      </div>
    </div>
  );
}
