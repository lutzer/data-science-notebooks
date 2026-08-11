# World Livable Atlas

A personal livability index scored on a global grid. See `PROJECT-BRIEF.md` for the full data-source discussion.

## Structure

Notebooks are numbered by stage:

- `0x_` — foundation (grid, shared configs)
- `1x_` — geography & environment (water, terrain, climate, air quality)
- `2x_` — economy & safety (income, cost, crime)
- `3x_` — urban & cultural (city proximity, culture, concerts)
- `9x_` — synthesis (scoring, mapping)

Only the framework notebooks are scaffolded:

- `01_grid.ipynb` — build the 0.5° land grid, save as NetCDF
- `10_variable_template.ipynb` — copy-me template for each data source
- `90_scoring.ipynb` — normalize + weighted sum
- `99_atlas_map.ipynb` — choropleth + interactive re-weighting

Weights live in `weights.yaml`. Shared helpers live in `common.py` (`RAW_DIR`, `PROCESSED_DIR`, `load_grid`, `load_weights`, `normalize_weights`, `load_layers`, `normalize`, `save_variable`, `plot_map`, `download`, `download_nasa_power_dataset`, `compute_temperature_pleasantness`, `weighted_score`) — notebooks import from it.

## Data

Raw and processed data live in `data/world-livable-atlas/{raw,processed}/` at the repo root (git-ignored). Notebooks reference this path as `../../data/world-livable-atlas/`.

## Adding a variable

1. Copy `10_variable_template.ipynb` to the next free slot in its category (e.g. `13_air_quality.ipynb`).
2. Fill in the fetch, clean, and interpolate-to-grid cells.
3. The notebook saves to `data/world-livable-atlas/processed/<variable>.nc` — one 2D DataArray on `(lat, lon)`.
4. Add `<variable>` to `weights.yaml`.
5. Re-run `90_scoring.ipynb` and `99_atlas_map.ipynb`.

## Running

From the repo root:

```sh
conda activate data_science
jupyter lab
```

Then open notebooks in numeric order.
