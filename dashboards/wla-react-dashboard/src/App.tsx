import { useEffect, useRef, useState } from 'react';
import { type DataCell, type FocusRequest, type MapData, WorldMap } from './components/WorldMap';
import {
  type WlaDataMatrix,
  loadCountryContinents,
  loadCountryNames,
  loadDatasetDescriptors,
  loadWlaMatrix,
  type WlaParameter,
} from './lib/data_loader';
import { Button, Flex, Link, Theme, ScrollArea } from "@radix-ui/themes";
import { ParameterBox } from './components/ParameterBox';
import { CellInfoCard } from './components/CellInfoCard';
import { CellsTable } from './components/CellsTable';
import "@radix-ui/themes/styles.css";
import { computeWeightedScore, constructWeightVectorFromParamaters, sortedIndicesByScore } from './lib/utils';

const STORAGE_KEY = 'wla-parameters';

type SavedParam = { weight: number; checked: boolean; variant: string | undefined };

function loadSavedParams(): Record<string, SavedParam> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as Record<string, SavedParam> : {};
  } catch {
    return {};
  }
}

function App() {
  const [data, setData] = useState<WlaDataMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parameters, setParameters] = useState<WlaParameter[]>([])
  const [mapData, setMapData] = useState<MapData>({ values: new Float32Array(), bounds: [0,0]})
  const [countryNames, setCountryNames] = useState<Record<string, string>>({});
  const [countryContinents, setCountryContinents] = useState<Record<string, string>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedCellInfoIndex, setSelectedCellInfoIndex] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);
  const focusKeyRef = useRef(0);

  function focusOnCell(index: number) {
    if (!data) return;
    setSelectedIndex(index);
    setSelectedCellInfoIndex(null);
    focusKeyRef.current += 1;
    setFocusRequest({ lat: data.lat[index], lon: data.lon[index], key: focusKeyRef.current });
  }

  useEffect(() => {
    Promise.all([loadWlaMatrix(), loadDatasetDescriptors(), loadCountryNames(), loadCountryContinents()])
      .then(([matrix, descriptors, names, continents]) => {
        setData(matrix)
        const saved = loadSavedParams();
        setParameters(descriptors.map((d) => {
          const s = saved[d.id];
          return {
            descriptor: d,
            weight: s?.weight ?? d.defaultWeight,
            checked: s?.checked ?? true,
            variant: s?.variant,
          };
        }));
        setCountryNames(names);
        setCountryContinents(continents);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (data !== null && parameters.length > 0) {
      const weights = constructWeightVectorFromParamaters(parameters, data.columns);
      const scores = computeWeightedScore(data, weights);
      const ranks = sortedIndicesByScore(scores);

      const n = scores.length;
      let min = scores[0];
      let max = scores[0];
      for (let i = 1; i < n; i++) {
        const v = scores[i];
        if (v < min) min = v;
        else if (v > max) max = v;
      }

      setMapData({ values: scores, bounds: [min, max], ranks: ranks });
    }
  }, [parameters, data]);

  useEffect(() => {
    if (parameters.length === 0) return;
    const toSave: Record<string, SavedParam> = {};
    for (const p of parameters) {
      toSave[p.descriptor.id] = { weight: p.weight, checked: p.checked, variant: p.variant };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [parameters]);

  function handleWeightChange(id: string, w: number) {
    setParameters(parameters.map((p) => p.descriptor.id === id ? { ...p, weight: w } : p));
  }

  function handleCheckedChange(id: string, c: boolean) {
    setParameters(parameters.map((p) => p.descriptor.id === id ? { ...p, checked: c } : p));
  }

  function handleVariantChange(id: string, v: string) {
    setParameters(parameters.map((p) => p.descriptor.id === id ? { ...p, variant: v } : p));
  }

  function handleClearWeights(): void {
    setParameters(parameters.map((p) => ({ ...p, checked: false })));
  }

  function handleRandomizeWeights(): void {
    setParameters(parameters.map((p) => {
      const variantKeys = p.descriptor.variants ? Object.keys(p.descriptor.variants) : [];
      const variant = variantKeys.length > 0
        ? variantKeys[Math.floor(Math.random() * variantKeys.length)]
        : p.variant;
      return { ...p, weight: Math.random() * 1.9 + 0.1, checked: true, variant };
    }));
  }

  function handleOnCellClicked(cell: DataCell | null) {
    setSelectedIndex(cell ? cell.index : null)
    setSelectedCellInfoIndex(cell ? cell.index : null)
  }

  return (
    <Theme scaling="90%" appearance="dark" accentColor="amber" grayColor="olive" radius="medium">
      <div className="wla-wrap">
        <header className="wla-hero">
          <h1 className="wla-title">
            World Liveable <em>Atlas</em>
          </h1>
          <p className="wla-lede">
            This project explores our planet in respect of the most liveable places.
            It divides the planet in cells of 0.5 ° latitude and longitude. At the equator a cell spans roughly 56km x 56km. The grid gets denser to the poles: at 60° latitude its size is 56 km x 28 km.
            Each grid cell is scored by a number of different metrices, that are weighted by the sliders below to reflect your priorities.
            Some of the parameters require you to pick a personal preference, such as temperature, rainfall and population.
            At the end of this survey you might find the perfect place for you to live.
          </p>
        </header>

        <div className="wla-layout">
          <aside className="wla-panel wla-params">
            <div className="wla-params-head">
              <h2>Parameters</h2>
            </div>
            <Flex gap="2" wrap="wrap" className="wla-params-actions">
              <Button variant="outline" onClick={handleRandomizeWeights}>Randomize weights</Button>
              <Button variant="outline" onClick={handleClearWeights}>Clear all weights</Button>
            </Flex>
            {parameters.length === 0 && (
              <div className="wla-field-desc">Loading parameters…</div>
            )}
            <ScrollArea type="always" scrollbars="vertical" style={{ height: 574 }}>
              <Flex direction="column" gap="1">
              {parameters.map((p) => (
                <ParameterBox
                  key={p.descriptor.id}
                  parameter={p}
                  onWeightChange={(v) => handleWeightChange(p.descriptor.id, v)}
                  onCheckedChange={(v) => handleCheckedChange(p.descriptor.id, v)}
                  onVariantChange={(v) => handleVariantChange(p.descriptor.id, v)}
                />
              ))}
              </Flex>
            </ScrollArea>
          </aside>

          <section className="wla-content">
            <div className="wla-panel wla-card">
              <div className="wla-card-head">
                <h2>World Map</h2>
              </div>
              <div className="wla-map-frame" style={{ maxHeight: 600 }}>
                {data && selectedCellInfoIndex != null && (
                  <CellInfoCard
                    data={data}
                    parameters={parameters}
                    rank={mapData.ranks.findIndex((v) => v == selectedCellInfoIndex)}
                    index={selectedCellInfoIndex}
                    countryNames={countryNames}
                    onClose={() => setSelectedCellInfoIndex(null)}
                  />
                )}
                <WorldMap
                  data={mapData}
                  height="600px"
                  selectedIndex={selectedIndex}
                  focusRequest={focusRequest}
                  onCellClick={handleOnCellClicked}
                  isDatasetLoading={data === null && error === null}
                />
              </div>
              <div className="wla-legend">
                <span>Lower score</span>
                <div className="wla-legend-bar" />
                <span>Higher score</span>
              </div>
            </div>

            <div className="wla-panel wla-card">
              <div className="wla-card-head">
                <h2>Top Places</h2>
                <div className="sub">click a row to locate it on the map</div>
              </div>
              {data && mapData.values.length > 0 && (
                <CellsTable
                  data={data}
                  mapData={mapData}
                  parameters={parameters}
                  countryNames={countryNames}
                  countryContinents={countryContinents}
                  onRowClick={focusOnCell}
                />
              )}
            </div>
          </section>
        </div>

        <footer className="wla-footer">
          Created 2026 by Lutz Reiter | <Link href="https://github.com/lutzer/world-liveable-atlas/">View Github</Link> | <Link href="https://github.com/lutzer/world-liveable-atlas/blob/main/notebooks/world-livable-atlas/91_distribution_analyses.ipynb">Read Data Discussion</Link>
        </footer>
      </div>
    </Theme>
  );
}

export default App;
