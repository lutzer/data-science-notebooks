"""Shared helpers for the world livability atlas notebooks.

Import as ``from helpers import PROCESSED_DIR, load_weights, ...`` from any
notebook in this folder.
"""

from pathlib import Path

import xarray as xr
import yaml

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


def save_variable(da, name):
    """Save ``da`` to ``processed/<name>.nc`` and return the path."""
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    out = PROCESSED_DIR / f"{name}.nc"
    da.to_netcdf(out)
    return out
