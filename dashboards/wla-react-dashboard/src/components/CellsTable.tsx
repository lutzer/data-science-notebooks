import { Fragment, useMemo, useState } from "react";
import { Box, Button, Flex, IconButton, Link, Table, Text } from "@radix-ui/themes";
import type { MapData } from "./WorldMap";
import type { WlaDataMatrix, WlaParameter } from "../lib/data_loader";
import SatelliteMap from "./SatelliteMap";
import { Bar } from "./CellInfoCard";
import { columnFor } from "../lib/utils";
import { TriangleRightIcon, TriangleDownIcon } from "@radix-ui/react-icons";

/**
 * Return the indices of cells with a finite score, sorted by score descending.
 * Used as the paginated backing list for the table.
 */
function sortedIndicesByScore(scores: Float32Array): number[] {
    const indices: number[] = [];
    for (let i = 0; i < scores.length; i++) {
        if (!Number.isNaN(scores[i])) indices.push(i);
    }
    indices.sort((a, b) => scores[b] - scores[a]);
    return indices;
}

/**
 * Weighted score-component breakdown for a single cell — mirrors the
 * calculation in CellInfoCard so an expanded table row can show the same
 * per-parameter bars without depending on the overlay card.
 */
function scoreComponentsFor(
    data: WlaDataMatrix,
    parameters: WlaParameter[],
    index: number,
) {
    const colIndex = new Map<string, number>();
    data.columns.forEach((c, i) => colIndex.set(c, i));
    const rowBase = index * data.numCols;

    let denominator = 0;
    for (const p of parameters) {
        if (!p.checked) continue;
        const col = columnFor(p);
        if (!col) continue;
        const j = colIndex.get(col);
        if (j == null) continue;
        const v = data.data[rowBase + j];
        if (!Number.isNaN(v)) denominator += p.weight;
    }

    return parameters
        .filter((p) => p.checked)
        .map((p) => {
            const col = columnFor(p);
            const j = col ? colIndex.get(col) : undefined;
            const value = j != null ? data.data[rowBase + j] : NaN;
            const contribution = denominator > 0 && !Number.isNaN(value)
                ? (p.weight * value) / denominator
                : NaN;
            return { id: p.descriptor.id, name: p.descriptor.name, value, contribution };
        });
}

/**
 * Expanded row body: per-parameter score bars on the left, satellite map of
 * the cell on the right. Rendered inside a full-width table cell.
 */
function ExpandedRow({ data, parameters, index }: {
    data: WlaDataMatrix,
    parameters: WlaParameter[],
    index: number,
}) {
    const components = scoreComponentsFor(data, parameters, index);
    const lat = data.lat[index];
    const lon = data.lon[index];

    return (
        <Flex gap="4" p="3" wrap="wrap" align="stretch">
            <Box style={{ flex: '1 1 260px', minWidth: 240 }}>
                <Text as="div" size="2" weight="bold" mb="2">Score components</Text>
                <Flex direction="column" gap="2">
                    {components.length === 0 && (
                        <Text size="1" color="gray">No parameters selected.</Text>
                    )}
                    {components.map((c) => (
                        <Flex key={c.id} direction="column" gap="1">
                            <Flex justify="between">
                                <Text size="1">{c.name}</Text>
                                <Text size="1" color="gray">
                                    {Number.isNaN(c.value) ? "—" : c.value.toFixed(3)}
                                </Text>
                            </Flex>
                            <Bar
                                score={c.value}
                                distribution={c.contribution}
                                scoreColor="var(--accent-9)"
                                distributionColor="var(--gray-3)"
                            />
                        </Flex>
                    ))}
                </Flex>
            </Box>
            <Box style={{ flex: '1 1 300px', minWidth: 240, minHeight: 320, position: 'relative' }}>
                <SatelliteMap longitude={lon} latitude={lat} zoom={8} width="100%" height="100%" interactable={true} />
            </Box>
        </Flex>
    );
}

/**
 * Radix UI table listing every scored grid cell, sorted by weighted score
 * descending. Supports client-side pagination and per-row expansion; expanded
 * rows show a score-component breakdown and a satellite map for the cell.
 * Row clicks still forward the cell's index to `onRowClick` so the parent can
 * sync map selection.
 */
export function CellsTable({
    data,
    mapData,
    parameters,
    countryNames,
    countryContinents,
    pageSize = 20,
    onRowClick,
}: {
    data: WlaDataMatrix,
    mapData: MapData,
    parameters: WlaParameter[],
    countryNames: Record<string, string>,
    countryContinents: Record<string, string>,
    pageSize?: number,
    onRowClick?: (index: number) => void,
}) {
    const sortedIndices = useMemo(
        () => sortedIndicesByScore(mapData.values),
        [mapData.values],
    );
    const [page, setPage] = useState(0);
    const [expanded, setExpanded] = useState<number | null>(null);

    const pageCount = Math.max(1, Math.ceil(sortedIndices.length / pageSize));
    const safePage = Math.min(page, pageCount - 1);
    const start = safePage * pageSize;
    const pageIndices = sortedIndices.slice(start, start + pageSize);

    function toggleExpanded(idx: number) {
        setExpanded((prev) => (prev === idx ? null : idx));
    }

    return (
        <Flex direction="column" gap="3">
            <Table.Root variant="surface">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell width="40px"></Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell width="60px">#</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Score</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Country</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Map</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {pageIndices.map((idx, rowOnPage) => {
                        const rank = start + rowOnPage + 1;
                        const code = data.country[idx];
                        const country = (code && countryNames[code]) || code || "—";
                        const continent = (code && countryContinents[code]) || "—";
                        const score = mapData.values[idx];
                        const lat = data.lat[idx];
                        const lon = data.lon[idx];
                        const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
                        const isExpanded = expanded === idx;
                        return (
                            <Fragment key={idx}>
                                <Table.Row
                                    onClick={onRowClick ? () => onRowClick(idx) : undefined}
                                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                                >
                                    <Table.Cell style={{ verticalAlign: 'middle' }}>
                                        <IconButton
                                            size="3"
                                            variant="ghost"
                                            aria-label={isExpanded ? "Collapse row" : "Expand row"}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpanded(idx);
                                            }}
                                        >
                                            {isExpanded ? <TriangleDownIcon/> : <TriangleRightIcon/>}

                                        </IconButton>
                                    </Table.Cell>
                                    <Table.Cell style={{ verticalAlign: 'middle' }}>{rank}</Table.Cell>
                                    <Table.Cell style={{ minWidth: 140, verticalAlign: 'middle' }}>
                                        <Flex direction="column" gap="1">
                                            <Text size="1">{score.toFixed(3)}</Text>
                                            <Bar
                                                score={score}
                                                distribution={0}
                                                scoreColor="var(--accent-9)"
                                                distributionColor="transparent"
                                            />
                                        </Flex>
                                    </Table.Cell>
                                    <Table.RowHeaderCell style={{ verticalAlign: 'middle' }}>{country}</Table.RowHeaderCell>
                                    <Table.Cell style={{ verticalAlign: 'middle' }}>
                                        <Link
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {lat.toFixed(3)}°, {lon.toFixed(3)}°
                                        </Link>
                                    </Table.Cell>
                                </Table.Row>
                                {isExpanded && (
                                    <Table.Row>
                                        <Table.Cell colSpan={6} style={{ background: 'var(--gray-2)' }}>
                                            <ExpandedRow data={data} parameters={parameters} index={idx} />
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Fragment>
                        );
                    })}
                </Table.Body>
            </Table.Root>
            <Flex justify="between" align="center">
                <Text size="2" color="gray">
                    {sortedIndices.length === 0
                        ? "No scored cells"
                        : `Showing ${start + 1}–${Math.min(start + pageSize, sortedIndices.length)} of ${sortedIndices.length}`}
                </Text>
                <Flex gap="2" align="center">
                    <Button
                        size="1"
                        variant="soft"
                        disabled={safePage === 0}
                        onClick={() => setPage(safePage - 1)}
                    >
                        ‹ Prev
                    </Button>
                    <Text size="2">Page {safePage + 1} of {pageCount}</Text>
                    <Button
                        size="1"
                        variant="soft"
                        disabled={safePage >= pageCount - 1}
                        onClick={() => setPage(safePage + 1)}
                    >
                        Next ›
                    </Button>
                </Flex>
            </Flex>
        </Flex>
    );
}
