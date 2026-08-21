import { useEffect, useState } from 'react';
import { WorldMap } from './components/WorldMap';
import { loadWlaData, type WlaRow } from './lib/loadParquet';
import "@radix-ui/themes/styles.css";
import { Theme, Grid, Box } from "@radix-ui/themes";
import { ParameterBox } from './components/ParameterBox';

function App() {
  const [rows, setRows] = useState<WlaRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadWlaData()])
      .then(([r]) => {
        setRows(r);
        console.log(r)
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
        <h1>
          World Livable Atlas
        </h1>
        <div className="dashboard">
          <div style={{ flex: 1, position: 'relative', margin: "20px 0", height: '500px' }}>
            <WorldMap height='500px'/>
          </div>
          <p>{status}</p>
          <Grid columns="3" gap="3" rows="repeat(2, 64px)" width="auto">
              <ParameterBox/>
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
