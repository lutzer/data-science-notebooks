import { useEffect, useState } from 'react';
import { WorldMap } from './components/WorldMap';
import { loadNormalizedWc, type WcRow } from './lib/loadParquet';

function App() {
  const [rows, setRows] = useState<WcRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([loadNormalizedWc()])
      .then(([r]) => {
        setRows(r);
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
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        margin: '20px',
      }}
    >
      <h1 style={{ textAlign: 'center', margin: '8px 0' }}>
        World Livable Atlas
      </h1>
      <p style={{ textAlign: 'center', margin: 0 }}>{status}</p>
      <div style={{ flex: 1, position: 'relative', margin: "20px 0" }}>
        <WorldMap/>
      </div>
    </div>
  );
}

export default App;
