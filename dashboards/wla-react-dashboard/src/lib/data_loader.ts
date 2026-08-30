import type { FeatureCollection } from 'geojson';
import {
  parquetMetadataAsync,
  parquetRead,
  parquetSchema,
} from 'hyparquet';
import type { AsyncBuffer, ParquetType } from 'hyparquet';

export interface WlaDataMatrix {
  lat: Float32Array;
  lon: Float32Array;
  country: string[];
  regionCode: string[];
  regionName: string[];
  data: Float32Array; // row-major: element (i, j) at data[i * numCols + j]
  numRows: number;
  numCols: number;
  columns: string[]; // column order, for reference
}

export interface DatasetSource {
  name: string,
  url: string,
}

export interface DatasetDiscriptor {
  id: string,
  number: number,
  name: string,
  category: string,
  correlationMultiplier: number,
  description: string
  sources?: DatasetSource[]
  defaultVariant? : string
  variants : { key: string } | undefined
  countryLevel?: boolean
}

export interface WlaParameter {
  descriptor: DatasetDiscriptor,
  weight: number,
  checked: boolean,
  variant: string | undefined
}

const NUMERIC_PARQUET_TYPES: ReadonlySet<ParquetType> = new Set([
  'INT32',
  'INT64',
  'FLOAT',
  'DOUBLE',
]);

/**
 * Wrap an in-memory ArrayBuffer as a hyparquet AsyncBuffer so the reader can
 * pull byte ranges from it without a network round-trip.
 */
function asyncBufferFromArrayBuffer(buffer: ArrayBuffer): AsyncBuffer {
  return {
    byteLength: buffer.byteLength,
    slice: (start, end) => buffer.slice(start, end),
  };
}

/**
 * Fetch `dashboard_data.parquet` from the dev server and decode it into a
 * WlaDataMatrix. Only numeric top-level columns whose names do not start with
 * `_` are placed into the row-major data matrix; `_lat`, `_lon`,
 * `_country_code`, `_region_code`, and `_region_name` are returned as
 * separate arrays.
 */
export async function loadWlaMatrix(): Promise<WlaDataMatrix> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/dashboard_data.parquet`);
  if (!res.ok) {
    throw new Error(`failed to fetch parquet: ${res.status} ${res.statusText}`);
  }
  const file = asyncBufferFromArrayBuffer(await res.arrayBuffer());

  const metadata = await parquetMetadataAsync(file);
  const schema = parquetSchema(metadata);
  const numRows = Number(metadata.num_rows);

  const columns = schema.children
    .map((child) => child.element)
    .filter((el) => !el.name.startsWith('_'))
    .filter((el) => el.type != null && NUMERIC_PARQUET_TYPES.has(el.type))
    .map((el) => el.name);

  const numCols = columns.length;
  const data = new Float32Array(numRows * numCols);
  const lat = new Float32Array(numRows);
  const lon = new Float32Array(numRows);
  const country = new Array<string>(numRows);
  const regionCode = new Array<string>(numRows);
  const regionName = new Array<string>(numRows);

  await parquetRead({
    file,
    metadata,
    columns: [...columns, '_lat', '_lon', '_country_code', '_region_code', '_region_name'],
    rowFormat: 'object',
    onComplete: (rows) => {
      for (let i = 0; i < numRows; i++) {
        const row = rows[i];
        for (let j = 0; j < numCols; j++) {
          const v = row[columns[j]];
          data[i * numCols + j] = v == null ? NaN : Number(v);
        }
        lat[i] = Number(row._lat);
        lon[i] = Number(row._lon);
        country[i] = (row._country_code as string) ?? "";
        regionCode[i] = (row._region_code as string) ?? "";
        regionName[i] = (row._region_name as string) ?? "";
      }
    },
  });

  return { lat, lon, country, regionCode, regionName, data, numRows, numCols, columns };
}

export async function loadDatasetDescriptors() : Promise<DatasetDiscriptor[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/datasets.json`);
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  const data = await response.json();
  return data.datasets;
}

/**
 * Fetch the Natural Earth 110m country polygons, drop Antarctica (matching
 * the Python prototype) and reproject the whole FeatureCollection.
 */
export async function loadCountries(): Promise<FeatureCollection> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/ne_110m_admin_0_countries.geojson`);
  if (!res.ok) {
    throw new Error(`failed to fetch countries geojson: ${res.status}`);
  }
  const raw: FeatureCollection = await res.json();
  raw.features = raw.features.filter(
    (f) => f.properties?.ADMIN !== 'Antarctica',
  );
  return raw;
}

/**
 * Fetches the Polygons for all grid cells.
 */
export async function loadCells(): Promise<FeatureCollection> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/dashboard_cells.geojson`);
  if (!res.ok) {
    throw new Error(`failed to fetch cells geojson: ${res.status}`);
  }
  const raw: FeatureCollection = await res.json();
  return raw;
}

/**
 * Build an ISO-A3 → display-name lookup from the Natural Earth countries
 * geojson. Used to resolve the `_country_code` column (also ISO-A3) to a
 * human-readable label.
 */
export async function loadCountryNames(): Promise<Record<string, string>> {
  const fc = await loadCountries();
  const map: Record<string, string> = {};
  for (const f of fc.features) {
    const props = f.properties ?? {};
    const code = props.ADM0_A3 as string | undefined;
    const name = (props.ADMIN as string | undefined) ?? (props.NAME as string | undefined);
    if (code && name) map[code] = name;
  }
  return map;
}

/**
 * Build an ISO-A3 → continent lookup from the Natural Earth countries geojson,
 * matching the `_country_code` column to the Natural Earth `CONTINENT` field.
 */
export async function loadCountryContinents(): Promise<Record<string, string>> {
  const fc = await loadCountries();
  const map: Record<string, string> = {};
  for (const f of fc.features) {
    const props = f.properties ?? {};
    const code = props.ADM0_A3 as string | undefined;
    const continent = props.CONTINENT as string | undefined;
    if (code && continent) map[code] = continent;
  }
  return map;
}