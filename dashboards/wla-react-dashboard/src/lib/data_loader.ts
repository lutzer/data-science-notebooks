import type { FeatureCollection } from 'geojson';
import { parquetReadObjects } from 'hyparquet';
import wasmInit, {readParquet} from "parquet-wasm";
import { tableFromIPC } from 'apache-arrow';

export interface WlaDataMatrix {
  x: Float32Array;
  y: Float32Array;
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
  description: string
  variants : { key: string } | undefined
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

  // discover columns from the schema, in file order
  const allColumns = arrowTable.schema.fields.map((f) => f.name);

  // keep only numeric columns — non-numeric ones can't go into a Float32Array matrix
  const columns = allColumns.filter((name) => {
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

  return { data, numRows, numCols, columns };
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