import { Fragment, useEffect, useMemo, useState } from "react";
import type { MapData } from "./WorldMap";
import type { WlaDataMatrix, WlaParameter } from "../lib/data_loader";
import SatelliteMap from "./SatelliteMap";
import { Bar } from "./CellInfoCard";
import { columnFor } from "../lib/utils";
import { TriangleRightIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { ScoreCircle } from "./ScoreCircle";
import { Button, Flex, IconButton, Table, Text, TextField } from "@radix-ui/themes";



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
 * Expanded row body: score circle + per-parameter score bars on the left,
 * satellite map of the cell on the right. Rendered inside a full-width table cell.
 */
function ExpandedRow({ data, parameters, score, index }: {
    data: WlaDataMatrix,
    parameters: WlaParameter[],
    score: number,
    index: number,
}) {
    const components = scoreComponentsFor(data, parameters, index);
    const lat = data.lat[index];
    const lon = data.lon[index];
    const country = data.country[index];
    const region = data.regionName[index];
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;

    return (
        <div
            style={{
                display: 'flex',
                gap: 24,
                padding: '18px 12px',
                flexWrap: 'wrap',
                alignItems: 'stretch',
                color: 'var(--text-on-paper)'
            }}
        >
            <div style={{ flex: '1 1 260px', minWidth: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <ScoreCircle size={100} score={score} />
                </div>
                <Flex direction="column" gap="1" mb="3">
                    <Text>
                        <strong>Country:</strong> {country}
                    </Text>
                    <Text>
                        <strong>Region:</strong> {region}
                    </Text>
                    <Text>
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                            {lat.toFixed(3)}°, {lon.toFixed(3)}°
                        </a>
                    </Text>
                </Flex>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-on-paper-dim)', marginBottom: 8 }}>
                    Score components
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {components.length === 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-on-paper-dim)' }}>No parameters selected.</div>
                    )}
                    {components.map((c) => (
                        <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                                <span style={{ color: 'var(--text-on-paper)' }}>{c.name}</span>
                                <span style={{ color: 'var(--text-on-paper-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {Number.isNaN(c.value) ? "—" : c.value.toFixed(3)}
                                </span>
                            </div>
                            <Bar
                                score={c.value}
                                distribution={c.contribution}
                                scoreColor="var(--teal)"
                                distributionColor="var(--gold)"
                            />
                        </div>
                    ))}
                </div>
            </div>
            <div style={{ flex: '1 1 300px', minWidth: 240, minHeight: 320, position: 'relative' }}>
                <SatelliteMap longitude={lon} latitude={lat} zoom={8} width="100%" height="100%" interactable={true} />
            </div>
        </div>
    );
}

/**
 * Editable page indicator: shows the current page and total page count, and
 * accepts a typed page number. Commits on Enter or blur, clamping to
 * `[1, pageCount]`.
 */
function PageInput({ page, pageCount, onPageChange }: {
    page: number;
    pageCount: number;
    onPageChange: (p: number) => void;
}) {
    const [draft, setDraft] = useState<string>(String(page));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!isFocused) setDraft(String(page));
    }, [page, isFocused]);

    function commit() {
        const parsed = parseInt(draft, 10);
        if (Number.isNaN(parsed)) {
            setDraft(String(page));
            return;
        }
        const clamped = Math.max(1, Math.min(pageCount, parsed));
        setDraft(String(clamped));
        if (clamped !== page) onPageChange(clamped);
    }

    return (
        <Flex align="center" gap="2">
            <Text size="1" style={{ color: 'var(--text-on-paper-dim)' }}>Page</Text>
            <TextField.Root
                size="1"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    setIsFocused(false);
                    commit();
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.currentTarget.blur();
                    } else if (e.key === 'Escape') {
                        setDraft(String(page));
                        e.currentTarget.blur();
                    }
                }}
                style={{ width: 56, fontFamily: 'JetBrains Mono, monospace' }}
                aria-label="Jump to page"
            />
            <Text size="1" style={{ color: 'var(--text-on-paper-dim)' }}>of {pageCount}</Text>
        </Flex>
    );
}

/**
 * Table listing every scored grid cell, sorted by weighted score descending.
 * Supports client-side pagination and per-row expansion; expanded rows show a
 * score-component breakdown and a satellite map for the cell. Row clicks
 * forward the cell's index to `onRowClick` so the parent can sync map selection.
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
    const [page, setPage] = useState(0);
    const [expanded, setExpanded] = useState<number | null>(null);

    const pageCount = Math.max(1, Math.ceil(mapData.ranks.length / pageSize));
    const safePage = Math.min(page, pageCount - 1);
    const start = safePage * pageSize;
    const pageIndices = mapData.ranks.slice(start, start + pageSize);

    function toggleExpanded(idx: number) {
        setExpanded((prev) => (prev === idx ? null : idx));
    }

    useEffect(() => {
        if (expanded)
            onRowClick?.(expanded)
    },[expanded])

    useEffect(() => {
        setExpanded(null);
    }, [parameters]);

    return (
        <div>
            <Table.Root variant="ghost" size="1">
                <Table.Header>
                    <Table.Row>
                        <Table.ColumnHeaderCell style={{ width: 32 }} />
                        <Table.ColumnHeaderCell style={{ width: 40 }}>#</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Score</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Country</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Region</Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell>Coordinates</Table.ColumnHeaderCell>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {pageIndices.map((idx, rowOnPage) => {
                        const rank = start + rowOnPage + 1;
                        const code = data.country[idx];
                        const country = (code && countryNames[code]) || code || "—";
                        // continent is derived here to keep the earlier lookup wiring intact;
                        // surfaced in the hover tooltip on the country cell.
                        const continent = (code && countryContinents[code]) || "";
                        const regionName = data.regionName[idx];
                        const regionCode = data.regionCode[idx];
                        const region = regionName || regionCode || "—";
                        const score = mapData.values[idx];
                        const lat = data.lat[idx];
                        const lon = data.lon[idx];
                        const isExpanded = expanded === idx;
                        return (
                            <Fragment key={idx}>
                                <Table.Row
                                    className="wla-row"
                                    onClick={() => toggleExpanded(idx)}
                                    style={onRowClick ? { cursor: 'pointer' } : undefined}
                                >
                                    <Table.Cell>
                                        <IconButton
                                            type="button"
                                            variant="ghost"
                                            size="1"
                                            color="gray"
                                            aria-label={isExpanded ? "Collapse row" : "Expand row"}
                                        >
                                            {isExpanded ? <TriangleDownIcon width={18} height={18} /> : <TriangleRightIcon width={18} height={18} />}
                                        </IconButton>
                                    </Table.Cell>
                                    <Table.Cell className="wla-cell-rank">{String(rank).padStart(2, '0')}</Table.Cell>
                                    <Table.Cell>
                                        <div className="wla-cell-score">
                                            <span className="num">{score.toFixed(3)}</span>
                                            <div className="bar"><i style={{ width: `${Math.max(0, Math.min(1, score)) * 100}%` }} /></div>
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell className="wla-region" title={continent || undefined}>{country}</Table.Cell>
                                    <Table.Cell className="wla-region" title={regionCode || undefined}>{region}</Table.Cell>
                                    <Table.Cell className="wla-coords">
                                        {lat.toFixed(3)}°, {lon.toFixed(3)}°
                                    </Table.Cell>
                                </Table.Row>
                                {isExpanded && (
                                    <Table.Row className="wla-expand-row">
                                        <Table.Cell colSpan={6}>
                                            <ExpandedRow data={data} score={score} parameters={parameters} index={idx} />
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </Fragment>
                        );
                    })}
                </Table.Body>
            </Table.Root>
            <Flex justify="between" align="center" gap="3" wrap="wrap" style={{ padding: '14px 10px 6px' }}>
                <Text size="1" style={{ color: 'var(--text-on-paper-dim)' }}>
                    {mapData.ranks.length === 0
                        ? "No scored cells"
                        : `Showing ${start + 1}–${Math.min(start + pageSize, mapData.ranks.length)} of ${mapData.ranks.length}`}
                </Text>
                <Flex align="center" gap="2">
                    <Button
                        type="button"
                        variant="soft"
                        color="gray"
                        size="1"
                        disabled={safePage === 0}
                        onClick={() => setPage(safePage - 1)}
                    >
                        ‹ Prev
                    </Button>
                    <PageInput
                        page={safePage + 1}
                        pageCount={pageCount}
                        onPageChange={(p) => setPage(p - 1)}
                    />
                    <Button
                        type="button"
                        variant="soft"
                        color="gray"
                        size="1"
                        disabled={safePage >= pageCount - 1}
                        onClick={() => setPage(safePage + 1)}
                    >
                        Next ›
                    </Button>
                </Flex>
            </Flex>
        </div>
    );
}
