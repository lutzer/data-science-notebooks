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


def load_country_lookup():
    """Return a ``DataFrame`` of ISO3, NAME, CONTINENT for every country in the cached mask.

    Produced alongside the ``country_mask.nc`` grid by ``03_region_mask.ipynb``,
    from the Natural Earth 1:50m admin_0 shapefile. Useful for notebooks that
    need to translate a country name (e.g. from a scraped source) to its ISO3,
    or attach a continent to per-cell ISO3s, without re-downloading Natural
    Earth themselves.
    """
    import pandas as pd

    ds = xr.open_dataset(PROCESSED_DIR / "country_mask.nc")
    return pd.DataFrame({
        "ISO3": ds["iso3"].values,
        "NAME": ds["name"].values,
        "CONTINENT": ds["continent"].values,
    })


def load_country_mask():
    """Open the shared admin_0 country mask built by ``03_region_mask.ipynb``.

    Returns a 2D ``(lat, lon)`` DataArray of ISO3 country codes as Python
    strings, with the empty string ``''`` for cells that fall outside every
    country (ocean, Antarctica). Consumers can then join score tables on ISO3
    without having to re-download Natural Earth polygons or re-run
    ``dominant_region_mask`` themselves — the mask is expensive to build but
    constant across variable notebooks that all rasterise onto the same grid.

    The empty-string sentinel is used instead of ``None`` because xarray
    silently converts ``None`` to ``NaN`` when wrapping an object dtype array,
    which then propagates as a float that breaks string comparisons. Empty
    strings survive the wrap and cleanly return ``NaN`` from ``pandas.Series.map``
    (the standard join pattern in consumer notebooks).
    """
    import numpy as np

    ds = xr.open_dataset(PROCESSED_DIR / "country_mask.nc")
    idx = ds["country_idx"].values
    iso3 = ds["iso3"].values
    valid = idx >= 0
    result = np.full(idx.shape, "", dtype=object)
    result[valid] = iso3[idx[valid]]
    return xr.DataArray(
        result,
        coords={"lat": ds.lat, "lon": ds.lon},
        dims=("lat", "lon"),
        name="iso3",
    )


def dominant_region_mask(regions, lon, lat, chunk_size=300):
    """Assign each cell to the region with the largest fractional coverage.

    Drop-in replacement for ``regions.mask(lon, lat)`` that behaves correctly
    on the fractional-coverage grid built in ``02_grid``: island cells and
    partial-land coastal cells whose *centre* falls in the ocean are still
    assigned to whichever country / region actually occupies most of the
    cell, rather than being dropped.

    Processes ``regions`` in chunks so peak memory stays bounded — a single
    ``mask_3D_frac_approx`` call on ~3000 ADM1 polygons at 0.5° globally
    allocates several GB and blows the kernel. Within each chunk we keep only
    the running ``(best_frac, best_number)`` pair, so total memory is
    proportional to ``chunk_size × lat × lon`` rather than the full region set.

    Parameters
    ----------
    regions : regionmask.Regions
        Region set to rasterise.
    lon, lat : array-like or xarray.DataArray
        Cell centre coordinates, as accepted by regionmask.
    chunk_size : int, optional
        Regions per ``mask_3D_frac_approx`` call. The default of 300 keeps peak
        allocation well below 1 GB on a global 0.5° grid.

    Returns
    -------
    xarray.DataArray
        2D ``(lat, lon)`` array of region numbers (float, with NaN for cells
        outside every region) — matching the return shape of ``.mask()``.
    """
    import numpy as np

    numbers = np.asarray(list(regions.numbers))
    best_frac = None
    best_num = None
    for start in range(0, len(numbers), chunk_size):
        chunk_nums = numbers[start:start + chunk_size]
        frac = regions[list(chunk_nums)].mask_3D_frac_approx(lon, lat)
        if frac.sizes["region"] == 0:
            # ``mask_3D_frac_approx`` silently drops regions with zero coverage
            # on the entire grid; a whole chunk of microstates can vanish. Skip.
            continue
        # Read the actual region numbers back from the mask output — positions
        # in ``frac`` do NOT line up with positions in ``chunk_nums`` when some
        # regions get dropped (Vatican, Monaco, etc. on a 0.5° grid).
        present_numbers = frac["region"].values
        chunk_max = frac.max("region")
        chunk_argmax = frac.argmax("region")
        chunk_best = xr.DataArray(
            present_numbers[chunk_argmax.values],
            coords=chunk_argmax.coords,
            dims=chunk_argmax.dims,
        ).astype("float64")
        if best_frac is None:
            best_frac = chunk_max
            best_num = chunk_best
        else:
            update = chunk_max > best_frac
            best_frac = xr.where(update, chunk_max, best_frac)
            best_num = xr.where(update, chunk_best, best_num)

    return best_num.where(best_frac > 0)


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
    if Path(out).exists():
        Path(out).unlink()
    da.to_netcdf(out)
    return out

async def download(url: str, filename: str):
    """Downloads url to filename, shows progress bar"""
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

    da.plot(ax=ax, **{"cmap": "RdYlGn", **kwargs})

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


# Shared preference profiles for the three tunable comfort layers. Consumed by
# both the interactive map (99_atlas_map) and the dashboard export (98) so the
# two stay in sync — if you add a profile here, both surfaces pick it up.
#
# Temperature/precipitation entries are ``(ideal, tolerance)`` for the
# triangular comfort helpers. Density entries are ``((min, max), tolerance_decades)``
# where ``None`` on either side of the range means unbounded on that side —
# wilderness is a pure upper bound (empty cells still score 1), urban a pure
# lower bound.
TEMP_PROFILES = {
    'Icy (5°C ±8)':           (0.0, 8.0),
    'Cool (15°C ±8)':         (15.0, 8.0),
    'Temperate (20°C ±10)':   (20.0, 10.0),
    'Warm (25°C ±8)':         (25.0, 8.0),
    'Tropical (27°C ±5)':     (27.0, 5.0),
}

PRECIP_PROFILES = {
    'Arid (20mm ±20)':       (20.0, 20.0),
    'Balanced (80mm ±60)':   (80.0, 60.0),
    'Wet (150mm ±60)':       (150.0, 60.0),
    'Very wet (250mm ±80)':  (250.0, 80.0),
}

DENSITY_PROFILES = {
    'Wilderness (≤1/km² ±1dec)':     ((None, 1),    1.0),
    'Rural (10–300/km² ±1dec)':      ((10, 300),    1.0),
    'Suburban (200–1500/km² ±1dec)': ((200, 1500),  1.0),
    'Urban (≥1500/km² ±1dec)':       ((1500, None), 1.0),
}


def load_raw_scoring_inputs(path=None):
    """Load raw temperature, precipitation, and density DataArrays from parquet.

    Companion to the ``raw_scoring_inputs.parquet`` file written by
    ``94_post_processing.ipynb`` — a compact land-only replacement for the
    three ``processed/_*_monthly.nc`` / ``_population_density.nc`` files.
    Returned DataArrays are reindexed onto the full atlas grid (from
    ``grid.nc``) so they align coordinate-wise with the pre-normalized layers
    in ``normalized.nc``; dropped ocean cells reappear as NaN.

    Parameters
    ----------
    path : pathlib.Path, optional
        Parquet file to load. Defaults to
        ``PROCESSED_DIR / 'raw_scoring_inputs.parquet'``.

    Returns
    -------
    tuple of xarray.DataArray
        ``(apparent_temp_monthly, precipitation_monthly, population_density)``
        — the first two on ``(lat, lon, month)``, the last on ``(lat, lon)``,
        suitable for passing to the ``compute_*`` helpers below.
    """
    import pandas as pd

    if path is None:
        path = PROCESSED_DIR / "raw_scoring_inputs.parquet"
    df = pd.read_parquet(path).set_index(["lat", "lon"])

    grid = load_grid()

    def _monthly(prefix):
        cols = [c for c in df.columns if c.startswith(f"{prefix}_")]
        wide = df[cols].copy()
        wide.columns = pd.Index([int(c.rsplit("_", 1)[1]) for c in cols], name="month")
        da = wide.stack().to_xarray().rename(prefix)
        return da.reindex(lat=grid.lat, lon=grid.lon)

    temp = _monthly("apparent_temp")
    precip = _monthly("precipitation")
    density = df["population_density"].to_xarray().reindex(lat=grid.lat, lon=grid.lon)
    return temp, precip, density


def compute_temperature_pleasantness(source, ideal_temp=20.0, tolerance=10.0):
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
    source : pathlib.Path or xarray.DataArray
        Path to the cached monthly-temperature NetCDF, or the DataArray
        itself (e.g. reconstructed from ``load_raw_scoring_inputs``).

    Returns
    -------
    xarray.DataArray
        2D ``(lat, lon)`` pleasantness scalar in ``[0, 1]``.
    """
    import numpy as np

    at_monthly = source if isinstance(source, xr.DataArray) else xr.open_dataarray(source)
    comfort = (1 - np.abs(at_monthly - ideal_temp) / tolerance).clip(0, 1)
    return comfort.mean("month")

def compute_precipitation_balance(source, ideal_monthly_mm=80.0, tolerance_mm=60.0):
    """Collapse cached monthly precipitation into a balance score.

    Reads ``processed/_precipitation_monthly.nc`` (produced by
    ``16_precipitation_balance.ipynb``) and applies a per-month triangular
    comfort function around ``ideal_monthly_mm``. Annual balance is the mean
    across 12 months, in ``[0, 1]`` — higher is better. Both drought months
    and deluge months score low, so seasonal monsoon climates are penalised
    relative to steadily-moist temperate ones even if their annual totals
    look similar.

    Separated from the notebook so re-scoring with different preferences (an
    interactive UI, a Dash app, a parameter sweep) does not need the notebook
    or a re-fetch of NASA POWER data.

    Parameters
    ----------
    source : pathlib.Path or xarray.DataArray
        Path to the cached monthly-precipitation NetCDF (mm per month on the
        atlas grid), or the DataArray itself (e.g. reconstructed from
        ``load_raw_scoring_inputs``).
    ideal_monthly_mm : float
        Preferred monthly precipitation total in mm.
    tolerance_mm : float
        Half-width of the comfort band in mm. A month whose total deviates by
        more than ``tolerance_mm`` from ``ideal_monthly_mm`` contributes 0.

    Returns
    -------
    xarray.DataArray
        2D ``(lat, lon)`` balance scalar in ``[0, 1]``.
    """
    import numpy as np

    precip_monthly = source if isinstance(source, xr.DataArray) else xr.open_dataarray(source)
    comfort = (1 - np.abs(precip_monthly - ideal_monthly_mm) / tolerance_mm).clip(0, 1)
    return comfort.mean("month")


def compute_population_density_score(source, density_range, tolerance_decades=1.0):
    """Score cells by how close their density is to a preferred range.

    Reads ``processed/population_density.nc`` (produced by
    ``21_population_density.ipynb``) — raw density in people/km² — and returns
    a ``[0, 1]`` comfort score. Cells whose density falls inside
    ``density_range`` score 1; outside the range the score drops linearly *in
    log10 space* and reaches 0 after ``tolerance_decades`` decades of
    deviation.

    Working in log space is essential because density spans ~5 orders of
    magnitude between wilderness (~0.01/km²) and megacity cores (~10⁴/km²),
    so a linear tolerance would either ignore the low end or collapse the
    high end. ``tolerance_decades`` therefore controls the falloff on both
    sides symmetrically: 1.0 means "half score one decade past the edge of
    the range, zero two decades past."

    Separated from the notebook so re-scoring with different preferences (an
    interactive UI, a Dash app, a parameter sweep) does not need the notebook
    or a re-fetch of GHS-POP.

    Parameters
    ----------
    source : pathlib.Path or xarray.DataArray
        Path to the raw density NetCDF (people/km² on the atlas grid), or
        the DataArray itself (e.g. reconstructed from
        ``load_raw_scoring_inputs``).
    density_range : tuple of (float or None, float or None)
        Preferred ``(min, max)`` density in people/km². Cells inside the
        range score 1. Use ``None`` for either bound to leave that side
        unbounded — ``(None, 1)`` is a pure upper bound (wilderness),
        ``(2000, None)`` a pure lower bound (urban).
    tolerance_decades : float, optional
        Falloff width in log10 units outside the range. Densities that
        deviate from the nearest range edge by more than this many decades
        score 0.

    Returns
    -------
    xarray.DataArray
        2D ``(lat, lon)`` score in ``[0, 1]`` — higher = closer to the
        preferred range. Ocean NaNs from the source layer are preserved.
    """
    import numpy as np

    # Clip to a minimum so log10(0)=-inf doesn't propagate. 1e-3 people/km²
    # is "effectively uninhabited" and roughly the level at which further
    # emptiness is indistinguishable from a preference standpoint.
    FLOOR = 1e-3
    d_min, d_max = density_range
    density = source if isinstance(source, xr.DataArray) else xr.open_dataarray(source)
    log_d = np.log10(density.clip(min=FLOOR))
    log_min = np.log10(max(d_min, FLOOR)) if d_min is not None else -np.inf
    log_max = np.log10(d_max) if d_max is not None else np.inf
    # Only one of below/above is non-zero at a time (assuming log_min<=log_max),
    # so their sum is the log-space distance from the nearest range edge.
    below = (log_min - log_d).clip(min=0)
    above = (log_d - log_max).clip(min=0)
    return (1 - (below + above) / tolerance_decades).clip(0, 1)


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