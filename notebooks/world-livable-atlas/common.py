"""Shared helpers for the world livability atlas notebooks.

Import as ``from common import PROCESSED_DIR, load_weights, ...`` from any
notebook in this folder.
"""

from pathlib import Path

import xarray as xr
import yaml
import httpx
from tqdm import tqdm

_ROOT = Path(__file__).resolve().parent
DATA_DIR = _ROOT.parent.parent / "data" / "world-livable-atlas"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
WEIGHTS_FILE = _ROOT / "weights.yaml"


def load_grid():
    """Open the shared ``grid.nc`` produced by ``01_grid.ipynb``."""
    return xr.open_dataset(PROCESSED_DIR / "grid.nc")


def load_weights(path=WEIGHTS_FILE):
    """Parse ``weights.yaml``, dropping zero-weighted entries.

    Values are returned as-is (raw). Use :func:`normalize_weights` to rescale
    to sum 1.
    """
    with open(path) as f:
        raw = yaml.safe_load(f)
    return {k: v for k, v in raw.items() if v > 0}


def normalize_weights(weights):
    """Rescale a weights dict so its values sum to 1."""
    total = sum(weights.values())
    return {k: v / total for k, v in weights.items()}


def load_layers(names):
    """Load processed layers by variable name. Missing files are skipped."""
    layers = {}
    for name in names:
        path = PROCESSED_DIR / f"{name}.nc"
        if not path.exists():
            print(f"skip {name}: {path} not found")
            continue
        layers[name] = xr.open_dataarray(path)
    return layers


def normalize(da):
    """Min-max normalize a DataArray to ``[0, 1]``. Flat arrays return zeros."""
    lo, hi = da.min().item(), da.max().item()
    return (da - lo) / (hi - lo) if hi > lo else da * 0


def weighted_score(layers, weights):
    """Combine normalized layers into a score with per-cell weight renormalization.

    At each grid cell, weights are rescaled over only the layers that have a
    value there, so a missing variable neither penalises nor discards the cell —
    it simply does not contribute. A cell is NaN only where every layer is
    missing.

    Parameters
    ----------
    layers : dict[str, xarray.DataArray]
        Normalized layers keyed by variable name. All layers must share the
        same coordinates.
    weights : dict[str, float]
        Raw weights keyed by variable name. Rescaled to sum 1 across ``layers``
        before use.

    Returns
    -------
    xarray.DataArray
        The weighted score.
    """
    active = normalize_weights({k: weights[k] for k in layers})
    numerator = sum(w * layers[k].fillna(0) for k, w in active.items())
    denominator = sum(w * layers[k].notnull() for k, w in active.items())
    return numerator / denominator.where(denominator > 0)


def save_variable(da, name):
    """Save ``da`` to ``processed/<name>.nc`` and return the path."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out = PROCESSED_DIR / f"{name}.nc"
    da.to_netcdf(out)
    return out

async def download(url: str, filename: str):
    filepath = Path(filename)

    # Create the parent directory if it doesn't exist
    filepath.parent.mkdir(parents=True, exist_ok=True)

    with open(filepath, 'wb') as f:
        async with httpx.AsyncClient() as client:
            async with client.stream('GET', url) as r:
                r.raise_for_status()
                total = int(r.headers.get('content-length', 0))

                tqdm_params = {
                    'desc': url,
                    'total': total,
                    'miniters': 1,
                    'unit': 'B',
                    'unit_scale': True,
                    'unit_divisor': 1024,
                }
                with tqdm(**tqdm_params) as pb:
                    downloaded = r.num_bytes_downloaded
                    async for chunk in r.aiter_bytes():
                        pb.update(r.num_bytes_downloaded - downloaded)
                        f.write(chunk)
                        downloaded = r.num_bytes_downloaded


def plot_map(da, ax=None, coastlines=True, title=None, **kwargs):
    """Plot a gridded variable on a lat/lon world map.

    Parameters
    ----------
    da : xr.DataArray or str
        DataArray to plot, or the name of a layer to load from
        ``PROCESSED_DIR/{name}.nc``.
    ax : matplotlib.axes.Axes, optional
        Axis to draw into. A new figure is created if omitted.
    coastlines : bool
        Overlay Natural Earth coastlines if the shapefile cached by
        ``11_water_proximity.ipynb`` is available. Silently skipped otherwise.
    title : str, optional
        Axis title. Defaults to the DataArray name.
    **kwargs
        Forwarded to :meth:`xarray.DataArray.plot` (e.g. ``cmap``, ``vmin``,
        ``vmax``, ``robust``).

    Returns
    -------
    matplotlib.axes.Axes
        The axis the plot was drawn on.
    """
    import matplotlib.pyplot as plt

    if ax is None:
        _, ax = plt.subplots(figsize=(12, 6))

    da.plot(ax=ax, **{"cmap": "viridis", **kwargs})

    if coastlines:
        coast_zip = RAW_DIR / "water_proximity" / "ne_10m_coastline.zip"
        if coast_zip.exists():
            import geopandas as gpd

            gpd.read_file(coast_zip).plot(ax=ax, color="black", linewidth=0.3)

    ax.set_xlim(-180, 180)
    ax.set_ylim(-90, 90)
    ax.set_aspect("equal")
    ax.set_title(title if title is not None else (da.name or ""))
    ax.set_xlabel("longitude")
    ax.set_ylabel("latitude")
    return ax


def compute_temperature_pleasantness(source : str, ideal_temp=20.0, tolerance=10.0):
    """Collapse cached monthly apparent temperature into a pleasantness score.

    Reads ``processed/_apparent_temp_monthly.nc`` (produced by
    ``14_temperature_pleasantness.ipynb``) and applies a per-month triangular
    comfort function around ``ideal_temp``. Annual pleasantness is the mean
    across 12 months, in ``[0, 1]`` — higher is better.

    Separated from the notebook so re-scoring with different preferences (an
    interactive UI, a Dash app, a parameter sweep) does not need the notebook
    or a re-fetch of NASA POWER data.

    Parameters
    ----------
    ideal_temp : float
        Preferred apparent temperature in °C.
    tolerance : float
        Half-width of the comfort band in °C. A month whose apparent
        temperature deviates by more than ``tolerance`` from ``ideal_temp``
        contributes 0 to the score.
    source : pathlib.Path, optional
        Override for the cached intermediate file (mainly for tests).

    Returns
    -------
    xarray.DataArray
        2D ``(lat, lon)`` pleasantness scalar in ``[0, 1]``.
    """
    import numpy as np

    path = source
    at_monthly = xr.open_dataarray(path)
    comfort = (1 - np.abs(at_monthly - ideal_temp) / tolerance).clip(0, 1)
    return comfort.mean("month")


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