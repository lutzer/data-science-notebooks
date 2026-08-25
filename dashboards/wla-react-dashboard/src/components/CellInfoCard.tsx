import { Card, Flex, Heading, IconButton, Text, ScrollArea, Link } from "@radix-ui/themes";
import type { WlaDataMatrix, WlaParameter } from "../lib/data_loader";
import { columnFor } from "../lib/utils";
import SatelliteMap from "./SatelliteMap";

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
        <div style={{ position: 'relative', height: 10, background: 'var(--gray-4)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, width: `${s}%`, background: scoreColor, opacity: 0.6 }} />
            <div style={{ position: 'absolute', inset: 0, width: `${d}%`, background: distributionColor, opacity: 0.6 }} />
        </div>
    );
}

/**
 * Overlay card summarising a single grid cell: coordinates, resolved country
 * name, and each checked parameter's raw value at that cell alongside its
 * weighted contribution to the overall score.
 */
export function CellInfoCard({ data, parameters, index, countryNames, onClose }: {
    data: WlaDataMatrix,
    parameters: WlaParameter[],
    index: number,
    countryNames: Record<string, string>,
    onClose: () => void,
}) {
    const lat = data.lat[index];
    const lon = data.lon[index];
    const code = data.country[index];
    const country = (code && countryNames[code]) || code || "—";
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

    return (
        <Card
            style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 320,
                maxHeight: 'calc(100% - 24px)',
                background: 'var(--color-panel-solid)',
                zIndex: 10,
            }}
        >
            <Flex justify="between" align="center" mb="2">
                <Heading size="3">Grid Cell</Heading>
                <IconButton size="1" variant="ghost" onClick={onClose} aria-label="Close">
                    ✕
                </IconButton>
            </Flex>
            <Flex direction="column" gap="1" mb="3">
                <Text size="2"><strong>Country:</strong> {country}</Text>
                <Text size="2"><strong>Coordinates:</strong> <Link href={mapsUrl}>{lat.toFixed(3)}°, {lon.toFixed(3)}°</Link></Text>
            </Flex>
            <ScrollArea style={{ maxHeight: 500 }}>
                <Heading size="2" mb="1" mt="3">Map</Heading>
                <SatelliteMap longitude={lon} latitude={lat} zoom={8} width={300} height={290}/>
                <Heading size="2" mb="1" mt="3">Score components</Heading>
                <Flex direction="column" gap="2" pr="2">
                    {components.map((c) => (
                        <Flex key={c.id} direction="column" gap="1">
                            <Text size="1">{c.name}</Text>
                            <Bar
                                score={c.value}
                                distribution={c.contribution}
                                scoreColor="var(--accent-9)"
                                distributionColor="var(--gray-3)"
                            />
                        </Flex>
                    ))}
                </Flex>
            </ScrollArea>
        </Card>
    );
}
