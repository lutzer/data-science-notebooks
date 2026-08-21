import { useEffect, useState } from 'react';
import { WorldMap } from './components/WorldMap';
import { type DatasetDiscriptor, loadDatasetDescriptors, loadWlaData, type WlaRow } from './lib/data_loader';
import { Theme, Grid, Heading, Text } from "@radix-ui/themes";
import { ParameterBox } from './components/ParameterBox';
import "@radix-ui/themes/styles.css";

function App() {
  const [rows, setRows] = useState<WlaRow[]>([]);
  const [descriptors, setDescriptors] = useState<DatasetDiscriptor[]>([]) 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadWlaData(), loadDatasetDescriptors()])
      .then(([r,d]) => {
        setRows(r);
        setDescriptors(d);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const status =
    error != null
      ? `error: ${error}`
      : rows != null
        ? `loaded ${rows.length} rows`
        : 'loading parquet…';

  return (
    <Theme>
        <Heading size="9" align="center" m="8">
          World Liveable Atlas
        </Heading>
        <div className="dashboard">
          <div style={{ flex: 1, position: 'relative', margin: "20px 0", height: '550px' }}>
            <WorldMap height='550px'/>
          </div>
          <Text>{status}</Text>
          <Heading size="5" my="5">Personal Weights</Heading>
          <Grid columns={{ xs:"1", sm: "2", md: "3"}} gap="3" width="auto">
            { descriptors.map((d) => <ParameterBox key={d.id} name={d.name} description={d.description}/>)}
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
