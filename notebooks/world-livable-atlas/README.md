# World Livable Atlas

A personal livability index scored on a global grid. See `PROJECT-BRIEF.md` for the full data-source discussion. Datasources and methods are described in `DATASETS.md`

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
- `9x_*.ipynb` — normalize + weighted sum
- `99_atlas_map.ipynb` — choropleth + interactive re-weighting

Weights live in `weights.yaml`. Shared helpers live in `common.py` (`RAW_DIR`, `PROCESSED_DIR`, `load_grid`, `load_weights`, `normalize_weights`, `load_layers`, `normalize`, `save_variable`, `plot_map`, `download`, `download_nasa_power_dataset`, `compute_temperature_pleasantness`, `weighted_score`) — notebooks import from it.

## Datasets

At-a-glance list of sources currently wired up. See `DATASETS.md` for methodology, confidence tiers, and links.

### Environment
| # | Variable | Source |
|---|---|---|
| 11 | `sea_proximity` | Natural Earth 10m coastlines / OSM coastline extracts |
| 12 | `terrain_ruggedness` | Copernicus GLO-30 DEM (fallback: SRTM) |
| 13 | `sun_hours` | NASA POWER API |
| 14 | `temperature_pleasantness` | ERA5 reanalysis (Copernicus CDS) — apparent temperature |
| 15 | `annual_greenness` | MODIS MOD13Q1/A1 NDVI composites |
| 16 | `precipitation_balance` | ERA5 / CHIRPS monthly precipitation |
| 17 | `air_quality` | Van Donkelaar et al. global PM2.5 surfaces (WUSTL ACAG) |
| 18 | `natural_disaster_risk` | GFDRR ThinkHazard! JSON API + World Bank official boundaries |
| 19 | `climate_vulnerability` | ND-GAIN Country Index (`vulnerability.csv`) |

### Population & Infrastructure
| # | Variable | Source |
|---|---|---|
| 21 | `population_density` | GHSL / WorldPop |
| 22 | `urbanity` | Natural Earth 10m populated places + GaWC World Cities 2024 |
| 23 | `internet_connectivity` | Ookla Speedtest Open Data |
| 24 | `healthcare_access` | Weiss et al. 2020 motorized travel-time raster (Malaria Atlas Project) |

### Social & Economy
| # | Variable | Source |
|---|---|---|
| 31 | `income` | Kummu et al. gridded GDP/HDI dataset |
| 32 | `cost_of_living` | Numbeo (city-level, scraped) — with Meta RWI + World Bank ICP as candidates |
| 33 | `crime_rate` | World Bank `VC.IHR.PSRC.P5` (UNODC homicides) + Numbeo Crime Index city overlay |
| 34 | `human_freedom` | V-Dem `v2x_libdem` (via `vdemdata` RData) + ACLED "violence against civilians" overlay |
| 35 | `corruption` | V-Dem `v2x_corr` (reuses the same `vdemdata` cache as 34) |
| 36 | `education` | GDL Subnational HDI v8.3 (Education Index) + GDL Shapefiles v6.5, via Zenodo mirror |
| 37 | `people_happiness` | World Happiness Report 2026 Figure 2.1 (Cantril ladder 3-year average per country) |
| 38 | `working_hours` | ILOSTAT `HOW_2EMP_SEX_NB_A` — Average weekly hours actually worked per employed person (ILO Modelled Estimates) |

### Shared boundaries
- Natural Earth 50m admin_0 polygons (via `regionmask`) — used to rasterize every country-level layer (19, 33, 34, 35, and the ThinkHazard side of 18).

## Data

Raw and processed data live in `data/world-livable-atlas/{raw,processed}/` at the repo root (git-ignored). Notebooks reference this path as `../../data/world-livable-atlas/`.

## Adding a variable

1. Copy `10_variable_template.ipynb` to the next free slot in its category (e.g. `13_air_quality.ipynb`).
2. Fill in the fetch, clean, and interpolate-to-grid cells.
3. The notebook saves to `data/world-livable-atlas/processed/<variable>.nc` — one 2D DataArray on `(lat, lon)`.
4. Add `<variable>` to `weights.yaml`.
5. Re-run all `9x_*` scripts and `99_atlas_map.ipynb` to visualize the data.

## Running

From the repo root:

```sh
conda activate data_science
jupyter lab
```

Then open notebooks in numeric order or run all notebooks by executing `00_main.ipynb` 

## Todo

* correct income, not by gdp per capita, because its mostly concentrated in large companies
* add some cultural/music metric
* add some food/gastronomy metric
* add some metric for public transport / public infratructure / sports infrasturcture, etc
* add some metric for income tax
* somehow the grid cell with -23.750°, -70.750° doesnt get any of the data that is mapped via the region
    file. why is thas? it should belong to chile. can you plot all the cells that arent mapped by a region
  the region file?