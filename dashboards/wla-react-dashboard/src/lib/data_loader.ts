import type { FeatureCollection } from 'geojson';
import wasmInit, {readParquet} from "parquet-wasm";
import { tableFromIPC } from 'apache-arrow';
import { transformCoordinates } from './geometry';

export interface WlaDataMatrix {
  lat: Float32Array;
  lon: Float32Array;
  country: string[];
  data: Float32Array; // row-major: element (i, j) at data[i * numCols + j]
  numRows: number;
  numCols: number;
  columns: string[]; // column order, for reference
}

export interface DatasetDiscriptor {
  id: string,
  number: number,
  name: string,
  category: string,
  defaultWeight: number,
  description: string
  defaultVariant? : string
  variants : { key: string } | undefined
}

export interface WlaParameter {
  descriptor: DatasetDiscriptor,
  weight: number,
  checked: boolean,
  variant: string | undefined
}

/**
 * Fetch `normalized_wc.parquet` from the dev server and decode it into a
 * DataMatrixobject.
 */
export async function loadWlaMatrix(): Promise<WlaDataMatrix> {
  await wasmInit();
  const res = await fetch('/data/dashboard_data.parquet');
  if (!res.ok) {
    throw new Error(`failed to fetch parquet: ${res.status} ${res.statusText}`);
  }
  const buffer = await res.arrayBuffer();

  const wasmTable = readParquet(new Uint8Array(buffer));
  const arrowTable = tableFromIPC(wasmTable.intoIPCStream());

  // discover columns from the schema, in file order, filter out columns that start with _
  const allColumns = arrowTable.schema.fields.map((f) => f.name);
  const dataColumns = allColumns.filter((c) => !c.startsWith("_"))

  // keep only numeric data columns — non-numeric ones can't go into a Float32Array matrix
  const columns = dataColumns.filter((name) => {
    const type = arrowTable.getChild(name)?.type;
    return type && (
      type.toString().includes('Int') ||
      type.toString().includes('Float')
    );
  });

  const numRows = arrowTable.numRows;
  const numCols = columns.length;
  const data = new Float32Array(numRows * numCols);

  for (let j = 0; j < numCols; j++) {
    const col = arrowTable.getChild(columns[j])!;
    const colData = col.toArray();
    for (let i = 0; i < numRows; i++) {
      data[i * numCols + j] = colData[i];
    }
  }

  const lat = arrowTable.getChild('_lat')?.toArray()
  const lon = arrowTable.getChild('_lon')?.toArray()

  const country = arrowTable.getChild('_country_code')?.toArray();

  return { lat, lon, country, data, numRows, numCols, columns };
}

export async function loadDatasetDescriptors() : Promise<DatasetDiscriptor[]> {
  const response = await fetch('/data/datasets.json');
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  const data = await response.json();
  return data.datasets;
}

/**
 * Fetch the Natural Earth 110m country polygons, drop Antarctica (matching
 * the Python prototype) and reproject the whole FeatureCollection.
 */
export async function loadCountries(): Promise<FeatureCollection> {
  const res = await fetch("/data/ne_110m_admin_0_countries.geojson");
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
  const res = await fetch("/data/dashboard_cells.geojson");
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