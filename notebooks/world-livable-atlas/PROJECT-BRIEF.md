# World Livable Atlas — Project Brief

## What it is

A personal livability index scored on a global 0.5°×0.5° land grid. Each grid cell is scored by ~20 environmental, infrastructural, and socio-economic metrics, then combined into a single composite score using **user-controlled weights**. Some metrics also take a personal preference (e.g. ideal temperature range). The output is an interactive map: slide the weights to reflect what *you* care about, and the atlas surfaces the places that fit.

The atlas is a data-exploration project, not a relocation service. Its purpose is to make the trade-offs between climate, cost, freedom, healthcare access, urbanity, etc. visually and quantitatively legible.

## Design decisions

Decisions that were open when this project started and have since been resolved:

- **Resolution: 0.5°×0.5° land grid.** ~56 km at the equator, denser toward the poles (~28 km lat at 60°). Coarse enough that every dataset can be interpolated onto it without heavy preprocessing, fine enough for a legible world map. Ocean cells are masked once, in `02_grid.ipynb`, and every downstream layer inherits that mask.
- **One canonical grid, everything snaps to it.** All per-metric notebooks write a 2-D `(lat, lon)` NetCDF variable on the same grid (`grid.nc`), so layers are directly stackable and comparable. Country-level metrics are rasterized once using Natural Earth 50m admin_0 polygons via `regionmask` (see `03_region_mask.ipynb`).
- **Confidence tiers.** Every metric is tagged 🟢 A / 🟡 B / 🔴 C in `DATASETS.md` — from "clean global raster, minimal preprocessing" down to "country-level flat fill, real methodology choices". This is deliberately visible so that a user does not mistake a country-flat corruption score for a street-level measurement.
- **Normalize before weighting.** Variables have wildly different ranges (income in USD vs. distance in km vs. a 0–1 vulnerability index). Each layer is normalized independently in the `9x_` stage so user weights actually mean *relative importance*, not "importance further inflated by whichever variable happens to have the biggest spread". The reasoning is written out in the *Scaling* section of `DATASETS.md`.
- **Grid ↔ city blend for point-source data.** Numbeo (cost, crime) and GaWC (urbanity) are city-level. Rather than picking one per cell, city values are diffused outward via exponential decay from city centroids on an Equal Earth projection, then blended over the country/grid baseline. This gives a continuous surface everywhere instead of a sparse dot map.
- **User weights live in `weights.yaml`.** Editable, human-readable, applied by `97_scoring.ipynb`. Adding a new metric = adding one line here plus one new notebook (see the *Adding a variable* section of `README.md`).

## Data selection principles

The metric-picking bar is deliberately narrow:

- **Publicly accessible.** No paywalled or auth-only sources except where an obvious free equivalent exists (e.g. V-Dem substitutes for CPI/WGI).
- **Global coverage preferred.** A dataset that only covers OECD countries gets rejected unless there is no global alternative for that concept.
- **Small downloads or streamable.** Prefer datasets that fit in `data/` locally or can be streamed block-by-block with `rasterio.Window` (see `21_population_density.ipynb`, `24_healthcare_access.ipynb`).
- **Yearly averages, most recent year available.** No real-time data, no monthly snapshots. Places don't become livable or unlivable overnight.

## Pipeline at a glance

```
0x_  foundation      →  grid.nc, country_mask.nc
1x_  environment     ┐
2x_  infrastructure  ├→  one <variable>.nc per metric in data/processed/
3x_  society/econ    ┘
9x_  synthesis       →  normalize → weighted score → dashboard export
```

Run `00_main.ipynb` to execute every notebook end-to-end via papermill. Captured outputs land in `output/`.

## Where to look next

- **`README.md`** — notebook structure, current dataset inventory (which metrics are wired, from which source), shared helpers in `common.py`, and the 5-step recipe for adding a new variable.
- **`DATASETS.md`** — per-metric methodology, confidence tiers, caveats, and the normalization/weighting theory that underpins the `9x_` stage.

## Scope & known limits

What this atlas explicitly is *not*:

- **Not street-level.** 0.5° cells are ~56 km wide — no neighborhood-scale claims.
- **Not real-time.** All metrics are yearly averages; a spike in air quality this week won't show up.
- **Tilted Western / urban** where the underlying data is crowdsourced (Numbeo, OSM) or biased toward high-income countries. Called out in the *Cross-cutting notes* section of `DATASETS.md`.
- **Country-flat by construction** for several social/economic layers (V-Dem freedom & corruption, ND-GAIN climate vulnerability, and the UNODC-only regions of crime) — intra-country variation is absent unless a city overlay fills it in.
