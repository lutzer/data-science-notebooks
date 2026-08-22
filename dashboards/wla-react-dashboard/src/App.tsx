import { useEffect, useState } from 'react';
import { WorldMap, type DataPoint } from './components/WorldMap';
import { type WlaDataMatrix, loadDatasetDescriptors, loadWlaMatrix, type WlaParameter } from './lib/data_loader';
import { Theme, Grid, Heading, Text } from "@radix-ui/themes";
import { ParameterBox } from './components/ParameterBox';
import "@radix-ui/themes/styles.css";
import { computeWeightedScore, constructWeightVectorFromParamaters } from './lib/utils';

function App() {
  const [data, setData] = useState<WlaDataMatrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parameters, setParameters] = useState<WlaParameter[]>([])
  const [mapData, setMapData] = useState<DataPoint[]>([])

  useEffect(() => {
    Promise.all([loadWlaMatrix(), loadDatasetDescriptors()])
      .then(([matrix,descriptors]) => {
        setData(matrix)
        setParameters(descriptors.map((d) => { return {
          descriptor: d,
          weight: d.defaultWeight,
          checked: false,
          variant: undefined
        }}));
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  useEffect(() => {
    if (data !== null && parameters.length > 0) {
      var weights = constructWeightVectorFromParamaters(parameters, data.columns);
      var scores = computeWeightedScore(data, weights);
      
      const n = scores.length;
      const result = new Array(n); // pre-allocate, avoid dynamic growth

      for (let i = 0; i < n; i++) {
        result[i] = { x: data.computed_x[i], y: data.computed_y[i], value: scores[i] };
      }

      setMapData(result);

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

  return (
    <Theme>
        <Heading size="9" align="center" m="8">
          World Liveable Atlas
        </Heading>
        <div className="dashboard">
          <div style={{ flex: 1, position: 'relative', margin: "20px 0", height: '550px' }}>
            <WorldMap data={mapData} height='550px'/>
          </div>
          <Text>{status}</Text>
          <Heading size="5" my="5">Personal Weights</Heading>
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
