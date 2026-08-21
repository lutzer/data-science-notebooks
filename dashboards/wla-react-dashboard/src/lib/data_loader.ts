import { parquetReadObjects } from 'hyparquet';

export interface WlaData {
  columnNames: string[]
  rows: number[][]
}

export interface WlaRow {
  lat: number;
  lon: number;
  [metric: string]: number | string | null;
}

export interface DatasetDiscriptor {
  id: string,
  number: number,
  name: string,
  category: string,
  description: string
}

/**
 * Fetch `normalized_wc.parquet` from the dev server and decode it into an
 * array of row objects. Rows with a null `lat` or `lon` are dropped, since
 * they cannot be mapped.
 */
export async function loadWlaData(): Promise<WlaRow[]> {
  const res = await fetch('data/normalized_wc.parquet');
  if (!res.ok) {
    throw new Error(`failed to fetch parquet: ${res.status} ${res.statusText}`);
  }
  const file = await res.arrayBuffer();
  const rows = (await parquetReadObjects({ file })) as WlaRow[];
  return rows.filter((r) => r.lat != null && r.lon != null);
}

export async function loadDatasetDescriptors() : Promise<DatasetDiscriptor[]> {
  const response = await fetch('data/datasets.json');
  if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  const data = await response.json();
  return data.datasets;
}
