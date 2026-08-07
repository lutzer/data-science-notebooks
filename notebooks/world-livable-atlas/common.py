from tqdm import tqdm
import httpx


def download_nasa_power_dataset(variable_raw_path: str, requested_param: str):
    API = 'https://power.larc.nasa.gov/api/temporal/climatology/regional'
    TILE = 10  # degrees; NASA POWER regional endpoint area cap

    def fetch_tile(lat0: int, lon0: int):
        """Download NASA POWER climatology for a 10°×10° tile; cache as JSON.

        Parameters
        ----------
        lat0, lon0 : int
            Southwest corner of the tile in degrees.

        Returns
        -------
        pathlib.Path
            Path to the cached JSON response.
        """
        path = variable_raw_path / f'tile_{lat0:+04d}_{lon0:+04d}_{requested_param}.json'
        if path.exists():
            return path
        params = {
            'parameters': requested_param,
            'community': 'RE',
            'longitude-min': lon0,
            'longitude-max': lon0 + TILE,
            'latitude-min': lat0,
            'latitude-max': lat0 + TILE,
            'format': 'JSON',
        }
        r = httpx.get(API, params=params, timeout=120)
        r.raise_for_status()
        path.write_text(r.text)
        return path


    tiles = [(lat, lon) for lat in range(-90, 90, TILE) for lon in range(-180, 180, TILE)]
    for lat0, lon0 in tqdm(tiles, desc='POWER tiles'):
        fetch_tile(lat0, lon0)

    print(f'{len(list(variable_raw_path.glob("tile_*.json")))} tiles cached in {variable_raw_path}')