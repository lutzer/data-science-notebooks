import { useEffect, useState } from 'react';
import { type MapData, WorldMap, } from './components/WorldMap';
import { type WlaDataMatrix, loadCountryContinents, loadCountryNames, loadDatasetDescriptors, loadWlaMatrix, type WlaParameter } from './lib/data_loader';
import { Theme, Grid, Heading, Text, Flex, Button, Box, ScrollArea } from "@radix-ui/themes";
import { ParameterBox } from './components/ParameterBox';
import { CellInfoCard } from './components/CellInfoCard';
import { CellsTable } from './components/CellsTable';
import "@radix-ui/themes/styles.css";
import { computeWeightedScore, constructWeightVectorFromParamaters } from './lib/utils';

function App() {
  const [data, setData] = useState<WlaDataMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parameters, setParameters] = useState<WlaParameter[]>([])
  const [mapData, setMapData] = useState<MapData>({ values: new Float32Array(), bounds: [0,0]})
  const [countryNames, setCountryNames] = useState<Record<string, string>>({});
  const [countryContinents, setCountryContinents] = useState<Record<string, string>>({});
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([loadWlaMatrix(), loadDatasetDescriptors(), loadCountryNames(), loadCountryContinents()])
      .then(([matrix, descriptors, names, continents]) => {
        setData(matrix)
        setParameters(descriptors.map((d) => { return {
          descriptor: d,
          weight: d.defaultWeight,
          checked: true,
          variant: undefined
        }}));
        setCountryNames(names);
        setCountryContinents(continents);
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

  function handleRandomizeWeights(): void {
    setParameters(parameters.map((p) => {
      return {...p, weight : Math.random(), checked: true}
    }))
  }

  return (
    <Theme scaling="90%">
        <Heading size="9" align="center" m="7">
          World Liveable Atlas
        </Heading>
        <div className="dashboard">
          <Box my="7">
            <Text as="div" mx="9">
              This project explores our planet in respect of the most livable places. 
              It divides the planet in cells of 0.5 ° latitude and longitude. At the equator a cell spans roughly 56km x 56km at 60° longitude its size is 56 km  x 28 km.
              Each grid cell is scored by a number of different metrices, that are weighted by the sliders below. 
              Some of the parameters require you to pick a personal preference, such as temperature.
              At the end of this survey you will hopefully find the perfect place for you.
              </Text>
          </Box>
          
          <Heading align="center" my="2">Parameters</Heading>
          <Flex mb="2" gap="2" justify="center">
            <Button onClick={handleRandomizeWeights}>Randomize Weigthts</Button>
            <Button onClick={handleClearWeights}>Clear All Weigthts</Button>
          </Flex>
          <Box className="score-box">
            <ScrollArea style={{ maxHeight: 450 }}>
              <Grid columns={{ xs:"1", sm: "2", md: "3"}} gap="3" width="auto">
                { parameters.map((p) =>
                  <ParameterBox key={p.descriptor.id}
                    parameter={p}
                    onWeightChange={(v) => handleWeightChange(p.descriptor.id, v)}
                    onCheckedChange={(v) => handleCheckedChange(p.descriptor.id, v)}
                    onVariantChange={(v) => handleVariantChange(p.descriptor.id, v)}/>)}
              </Grid>
            </ScrollArea>
          </Box>
          <Heading align="center" my="2">World Map</Heading>
          <div style={{ flex: 1, position: 'relative', margin: "20px 0", height: '600px' }}>
            <WorldMap
              data={mapData}
              height='600px'
              selectedIndex={selectedIndex}
              onCellClick={(cell) => setSelectedIndex(cell ? cell.index : null)}
              isDatasetLoading={data === null && error === null}
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
          
          <Heading align="center" my="2">Top Places</Heading>
          {data && mapData.values.length > 0 && (
            <Box mt="5">
              <CellsTable
                data={data}
                mapData={mapData}
                parameters={parameters}
                countryNames={countryNames}
                countryContinents={countryContinents}
                onRowClick={setSelectedIndex}
              />
            </Box>
          )}

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
