import type { WlaDataMatrix, WlaParameter } from "../lib/data_loader";
import { columnFor } from "../lib/utils";
import SatelliteMap from "./SatelliteMap";
import { ScoreCircle } from "./ScoreCircle";
import { IconButton } from "@radix-ui/themes";
import { Cross1Icon } from "@radix-ui/react-icons";

/**
 * Single horizontal bar with two semi-transparent fills overlaid on a shared
 * [0, 1] axis — one for `score`, one for `distribution`. Where they overlap
 * the colors blend, so both remain visible regardless of which is longer.
 */
export function Bar({ score, distribution, scoreColor, distributionColor }: {
    score: number,
    distribution: number,
    scoreColor: string,
    distributionColor: string,
}) {
    const s = Number.isNaN(score) ? 0 : Math.max(0, Math.min(1, score)) * 100;
    const d = Number.isNaN(distribution) ? 0 : Math.max(0, Math.min(1, distribution)) * 100;
    return (
        <div style={{ position: 'relative', height: 8, background: 'rgba(27, 47, 40, 0.12)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${s}%`, background: scoreColor, opacity: 0.65 }} />
            <div style={{ position: 'absolute', inset: 0, width: `${d}%`, background: distributionColor, opacity: 0.65 }} />
        </div>
    );
}

/**
 * Floating overlay card summarising a single grid cell. Styled to sit on top
 * of the dark map frame using the paper palette so it reads clearly against
 * the ink background.
 */
export function CellInfoCard({ data, parameters, rank, index, countryNames, onClose }: {
    data: WlaDataMatrix,
    parameters: WlaParameter[],
    rank: number,
    index: number,
    countryNames: Record<string, string>,
    onClose: () => void,
}) {
    const lat = data.lat[index];
    const lon = data.lon[index];
    const code = data.country[index];
    const country = (code && countryNames[code]) || code || "—";
    const regionName = data.regionName[index];
    const regionCode = data.regionCode[index];
    const region = regionName || regionCode || "—";
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;

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

    const components = parameters
        .filter((p) => p.checked)
        .map((p) => {
            const col = columnFor(p);
            const j = col ? colIndex.get(col) : undefined;
            const value = j != null ? data.data[rowBase + j] : NaN;
            const contribution = denominator > 0 && !Number.isNaN(value)
                ? (p.weight * value) / denominator
                : NaN;
            return { id: p.descriptor.id, name: p.descriptor.name, weight: p.weight, value, contribution };
        });

    const score = components.reduce((acc, curr) => acc + (Number.isNaN(curr.contribution) ? 0 : curr.contribution), 0);

    return (
        <div
            style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 320,
                maxHeight: 'calc(100% - 24px)',
                background: 'var(--paper)',
                color: 'var(--text-on-paper)',
                borderRadius: 12,
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.6)',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            <div style={{ padding: '14px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(27,47,40,0.12)' }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600 }}>Grid Cell</div>
                <IconButton
                    type="button"
                    variant="ghost"
                    color="gray"
                    size="1"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <Cross1Icon />
                </IconButton>
            </div>

            <div style={{ padding: '12px 16px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>
                    <ScoreCircle size={80} score={score} />
                </div>
                 <div style={{ fontSize: 12.5 }}>
                    <strong>Rank:</strong> {rank}
                </div>
                <div style={{ fontSize: 12.5 }}>
                    <strong>Country:</strong> {country}
                </div>
                <div style={{ fontSize: 12.5 }} title={regionCode || undefined}>
                    <strong>Region:</strong> {region}
                </div>
                <div style={{ fontSize: 12.5, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-on-paper-dim)' }}>
                    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                        {lat.toFixed(3)}°, {lon.toFixed(3)}°
                    </a>
                </div>
            </div>

            <div style={{ padding: '4px 16px 16px', overflowY: 'auto' }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-on-paper-dim)', marginTop: 10, marginBottom: 6 }}>
                    Map
                </div>
                <div style={{ borderRadius: 8, overflow: 'hidden' }}>
                    <SatelliteMap longitude={lon} latitude={lat} zoom={8} width={288} height={230} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-on-paper-dim)', marginTop: 14, marginBottom: 6 }}>
                    Score components
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {components.map((c) => (
                        <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ fontSize: 11.5, display: 'flex', justifyContent: 'space-between' }}>
                                <span>{c.name}</span>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-on-paper-dim)' }}>
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
        </div>
    );
}
