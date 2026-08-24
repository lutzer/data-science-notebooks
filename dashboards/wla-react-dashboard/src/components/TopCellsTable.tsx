import { Link, Table } from "@radix-ui/themes";
import type { MapData } from "./WorldMap";
import type { WlaDataMatrix } from "../lib/data_loader";

/**
 * Compute the indices of the top `count` grid cells by score, ignoring NaN
 * scores. Uses a bounded insertion into a small sorted array so we avoid
 * sorting the entire scores array for a top-N slice.
 */
function topIndicesByScore(scores: Float32Array, count: number): number[] {
    const top: { i: number; v: number }[] = [];
    for (let i = 0; i < scores.length; i++) {
        const v = scores[i];
        if (Number.isNaN(v)) continue;
        if (top.length < count) {
            top.push({ i, v });
            if (top.length === count) top.sort((a, b) => b.v - a.v);
        } else if (v > top[count - 1].v) {
            let k = count - 1;
            while (k > 0 && top[k - 1].v < v) {
                top[k] = top[k - 1];
                k--;
            }
            top[k] = { i, v };
        }
    }
    if (top.length < count) top.sort((a, b) => b.v - a.v);
    return top.map((t) => t.i);
}

/**
 * Radix UI table listing the top `count` grid cells by weighted score, with
 * score, country name and continent columns. Rows are clickable and forward
 * the cell's index to `onRowClick` so the parent can sync map selection.
 */
export function TopCellsTable({
    data,
    mapData,
    countryNames,
    countryContinents,
    count = 20,
    onRowClick,
}: {
    data: WlaDataMatrix,
    mapData: MapData,
    countryNames: Record<string, string>,
    countryContinents: Record<string, string>,
    count?: number,
    onRowClick?: (index: number) => void,
}) {
    const indices = topIndicesByScore(mapData.values, count);

    return (
        <Table.Root variant="surface">
            <Table.Header>
                <Table.Row>
                    <Table.ColumnHeaderCell width="60px">#</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Score</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Country</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Continent</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell>Map</Table.ColumnHeaderCell>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {indices.map((idx, rank) => {
                    const code = data.country[idx];
                    const country = (code && countryNames[code]) || code || "—";
                    const continent = (code && countryContinents[code]) || "—";
                    const score = mapData.values[idx];
                    const lat = data.lat[idx];
                    const lon = data.lon[idx];
                    const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
                    return (
                        <Table.Row
                            key={idx}
                            onClick={onRowClick ? () => onRowClick(idx) : undefined}
                            style={onRowClick ? { cursor: 'pointer' } : undefined}
                        >
                            <Table.Cell>{rank + 1}</Table.Cell>
                            <Table.Cell>{score.toFixed(3)}</Table.Cell>
                            <Table.RowHeaderCell>{country}</Table.RowHeaderCell>
                            <Table.Cell>{continent}</Table.Cell>
                            <Table.Cell>
                                <Link
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Open
                                </Link>
                            </Table.Cell>
                        </Table.Row>
                    );
                })}
            </Table.Body>
        </Table.Root>
    );
}
