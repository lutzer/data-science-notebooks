import { useEffect, useState } from 'react';
import { type MapData, WorldMap, } from './components/WorldMap';
import { type WlaDataMatrix, loadCountryNames, loadDatasetDescriptors, loadWlaMatrix, type WlaParameter } from './lib/data_loader';
import { Theme, Grid, Heading, Text, Flex, Button } from "@radix-ui/themes";
import { ParameterBox } from './components/ParameterBox';
import { CellInfoCard } from './components/CellInfoCard';
import "@radix-ui/themes/styles.css";
import { computeWeightedScore, constructWeightVectorFromParamaters } from './lib/utils';

function App() {
  const [data, setData] = useState<WlaDataMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parameters, setParameters] = useState<WlaParameter[]>([])
  const [mapData, setMapData] = useState<MapData>({ values: [], bounds: [0,0]})
  const [countryNames, setCountryNames] = useState<Record<string, string>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // const [cells, setCells] = useState<Position[][]>([])

  useEffect(() => {
    Promise.all([loadWlaMatrix(), loadDatasetDescriptors(), loadCountryNames()])
      .then(([matrix, descriptors, names]) => {
        setData(matrix)
        setParameters(descriptors.map((d) => { return {
          descriptor: d,
          weight: d.defaultWeight,
          checked: true,
          variant: undefined
        }}));
        setCountryNames(names);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  useEffect(() => {
    // compute polygons

  }, [data])

  useEffect(() => {
    if (data !== null && parameters.length > 0) {
    const weights = constructWeightVectorFromParamaters(parameters, data.columns);
    const scores = computeWeightedScore(data, weights); // Float32Array

    const n = scores.length;
    let min = scores[0];
    let max = scores[0];
    for (let i = 1; i < n; i++) {
      const v = scores[i];
      if (v < min) min = v;
      else if (v > max) max = v;
    }

    setMapData({ values: scores, bounds: [min, max] });
  }
  },[parameters, data])

  const status =
    error != null
      ? `error: ${error}`
      : data != null
        ? `loaded ${data.numRows} rows`
        : 'loading parquet…';

  function handleWeightChange(id: string, w: number) {
    setParameters(parameters.map((p) => {
      return p.descriptor.id === id ? {...p, weight : w} : p
    }))
  }

  function handleCheckedChange(id: string, c: boolean) {
    setParameters(parameters.map((p) => {
      return p.descriptor.id === id ? {...p, checked : c} : p
    }))
  }

  function handleVariantChange(id: string, v: string) {
    setParameters(parameters.map((p) => {
      return p.descriptor.id === id ? {...p, variant : v} : p
    }))
  }

  function handleClearWeights(): void {
    setParameters(parameters.map((p) => {
      return {...p, checked : false}
    }))
  }

  return (
    <Theme scaling="90%">
        <Heading size="9" align="center" m="5">
          World Liveable Atlas
        </Heading>
        <div className="dashboard">
          <div style={{ flex: 1, position: 'relative', margin: "20px 0", height: '550px' }}>
            <WorldMap
              data={mapData}
              height='550px'
              selectedIndex={selectedIndex}
              onCellClick={(cell) => setSelectedIndex(cell ? cell.index : null)}
            />
            {data && selectedIndex != null && (
              <CellInfoCard
                data={data}
                parameters={parameters}
                index={selectedIndex}
                countryNames={countryNames}
                onClose={() => setSelectedIndex(null)}
              />
            )}
          </div>
          <Flex justify="between" mb="2">
            <Heading>Parameters</Heading>
            <Button onClick={handleClearWeights}>Clear Weigthts</Button>
          </Flex>
          <Grid columns={{ xs:"1", sm: "2", md: "3"}} gap="3" width="auto">
            { parameters.map((p) => 
              <ParameterBox key={p.descriptor.id} 
                parameter={p} 
                onWeightChange={(v) => handleWeightChange(p.descriptor.id, v)} 
                onCheckedChange={(v) => handleCheckedChange(p.descriptor.id, v)} 
                onVariantChange={(v) => handleVariantChange(p.descriptor.id, v)}/>)}
            </Grid>
        </div> 
    </Theme>
    // <div
    //   style={{
    //     display: 'flex',
    //     flexDirection: 'column',
    //     height: '100vh',
    //     margin: '20px',
    //   }}
    // >
 
    //   <p style={{ textAlign: 'center', margin: 0 }}>{status}</p>
 
    // </div>
  );
}

export default App;
