import { Fragment, useMemo, useState } from "react";
import type { MapData } from "./WorldMap";
import type { WlaDataMatrix, WlaParameter } from "../lib/data_loader";
import SatelliteMap from "./SatelliteMap";
import { Bar } from "./CellInfoCard";
import { columnFor } from "../lib/utils";
import { TriangleRightIcon, TriangleDownIcon } from "@radix-ui/react-icons";
import { ScoreCircle } from "./ScoreCircle";

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

    return (
        <div
            style={{
                display: 'flex',
                gap: 24,
                padding: '18px 12px',
                flexWrap: 'wrap',
                alignItems: 'stretch',
            }}
        >
            <div style={{ flex: '1 1 260px', minWidth: 240 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                    <ScoreCircle size={100} score={score} />
                </div>
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
        <div>
            <table className="wla-table">
                <thead>
                    <tr>
                        <th style={{ width: 32 }}></th>
                        <th style={{ width: 40 }}>#</th>
                        <th>Score</th>
                        <th>Country</th>
                        <th>Coordinates</th>
                    </tr>
                </thead>
                <tbody>
                    {pageIndices.map((idx, rowOnPage) => {
                        const rank = start + rowOnPage + 1;
                        const code = data.country[idx];
                        const country = (code && countryNames[code]) || code || "—";
                        // continent is derived here to keep the earlier lookup wiring intact;
                        // surfaced in the hover tooltip on the country cell.
                        const continent = (code && countryContinents[code]) || "";
                        const score = mapData.values[idx];
                        const lat = data.lat[idx];
                        const lon = data.lon[idx];
                        const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
                        const isExpanded = expanded === idx;
                        return (
                            <Fragment key={idx}>
                                <tr
                                    className="wla-row"
                                    onClick={onRowClick ? () => onRowClick(idx) : undefined}
                                >
                                    <td>
                                        <button
                                            type="button"
                                            className="wla-expand-btn"
                                            aria-label={isExpanded ? "Collapse row" : "Expand row"}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpanded(idx);
                                            }}
                                        >
                                            {isExpanded ? <TriangleDownIcon width={18} height={18} /> : <TriangleRightIcon width={18} height={18} />}
                                        </button>
                                    </td>
                                    <td className="wla-cell-rank">{String(rank).padStart(2, '0')}</td>
                                    <td>
                                        <div className="wla-cell-score">
                                            <span className="num">{score.toFixed(3)}</span>
                                            <div className="bar"><i style={{ width: `${Math.max(0, Math.min(1, score)) * 100}%` }} /></div>
                                        </div>
                                    </td>
                                    <td className="wla-region" title={continent || undefined}>{country}</td>
                                    <td className="wla-coords">
                                        <a
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {lat.toFixed(3)}°, {lon.toFixed(3)}°
                                        </a>
                                    </td>
                                </tr>
                                {isExpanded && (
                                    <tr className="wla-expand-row">
                                        <td colSpan={5}>
                                            <ExpandedRow data={data} score={score} parameters={parameters} index={idx} />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        );
                    })}
                </tbody>
            </table>
            <div className="wla-table-foot">
                <span>
                    {sortedIndices.length === 0
                        ? "No scored cells"
                        : `Showing ${start + 1}–${Math.min(start + pageSize, sortedIndices.length)} of ${sortedIndices.length}`}
                </span>
                <div className="wla-page-controls">
                    <button
                        type="button"
                        className="wla-btn-mini"
                        disabled={safePage === 0}
                        onClick={() => setPage(safePage - 1)}
                    >
                        ‹ Prev
                    </button>
                    <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-on-paper)' }}>
                        Page {safePage + 1} of {pageCount}
                    </span>
                    <button
                        type="button"
                        className="wla-btn-mini"
                        disabled={safePage >= pageCount - 1}
                        onClick={() => setPage(safePage + 1)}
                    >
                        Next ›
                    </button>
                </div>
            </div>
        </div>
    );
}
