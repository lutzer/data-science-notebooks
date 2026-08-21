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

/**
 * Fetch `normalized_wc.parquet` from the dev server and decode it into an
 * array of row objects. Rows with a null `lat` or `lon` are dropped, since
 * they cannot be mapped.
 */
export async function loadWlaData(): Promise<WlaRow[]> {
  const res = await fetch('/normalized_wc.parquet');
  if (!res.ok) {
    throw new Error(`failed to fetch parquet: ${res.status} ${res.statusText}`);
  }
  const file = await res.arrayBuffer();
  console.log(file)
  const rows = (await parquetReadObjects({ file })) as WlaRow[];
  return rows.filter((r) => r.lat != null && r.lon != null);
}
