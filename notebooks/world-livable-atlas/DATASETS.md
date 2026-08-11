# Livability Atlas — Metrics & Datasets

All data is laid out on a global grid. Preference given to high-resolution,
freely available, yearly-averaged datasets that don't require heavy
preprocessing. Where a city list is used, geocode it and snap to the
nearest grid cell.

Always try to use the most recent data.

Each metric is tagged with a **confidence tier**:

- 🟢 **Tier A** — clean global raster, high resolution, minimal preprocessing
- 🟡 **Tier B** — computed/derived, real methodology choices involved
- 🔴 **Tier C** — patchy, national/city-level only, or no good global source

---

## Environment

### 11 water_proximity 🟢
Distance from each grid cell to the nearest coastline.

- **Dataset:** [Natural Earth coastlines](https://www.naturalearthdata.com/downloads/10m-physical-vectors/) or [OpenStreetMap coastline extracts](https://osmdata.openstreetmap.de/data/coastlines.html)
- **Method:** raster distance transform from coastline vector to grid.
- Simple, no real judgment calls.

### 12 terrain_ruggedness *(renamed from mountain_proximity)* 🟢
Measures slope / elevation variance within a cell — i.e. how mountainous
the terrain is, not distance to mountains.

- **Dataset:** [Copernicus GLO-30 DEM](https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model) (30m global) or [SRTM](https://www2.jpl.nasa.gov/srtm/) (90m, older, simpler)
- **Method:** compute slope/elevation std-dev per cell.
- Note: consider a U-shaped preference curve — some people want mountain views, others want flat land — rather than treating "more rugged = worse" monotonically.

### 13 sun_hours 🟢
Annual sunshine hours per grid cell.

- **Dataset:** [NASA POWER](https://power.larc.nasa.gov/) — free API, global, daily/monthly since 1981.
- Clean, well-maintained, yearly averages trivial to compute.

### 14 temperature_pleasantness 🟡
Formula still to be decided. Suggested approach: don't use raw temperature —
use apparent/perceived temperature (accounts for humidity), and penalize
deviation from a comfortable range (~18–22°C).

- **Dataset:** [ERA5 reanalysis](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels) (Copernicus Climate Data Store) — temperature, humidity, wind, ~9–31km resolution, hourly to yearly.
- **Method suggestion:** compute Heat Index or Wet-Bulb Globe Temperature per cell as the pleasantness proxy instead of inventing a formula from scratch.

### 15 annual_greenness

Mean NDVI - Compute the annual mean on how green a place is

#### Data sources for annual composites
* MODIS MOD13Q1/A1 (NASA) — already gives 16-day NDVI/EVI composites; just average or max them across the year. Easiest path to an annual layer with minimal processing. 250m–1km resolution.
* Copernicus Global Land Service — has ready-made annual vegetation indicators (e.g., FAPAR, LAI, NDVI) at global scale, free.
* Sentinel-2 via Google Earth Engine — build your own annual composite (median/max) at 10m if you want higher resolution than MODIS; more compute but much finer detail.
* Landsat annual composites (USGS) — some pre-built annual greenest-pixel composites exist (e.g., via GEE's LANDSAT/.../ANNUAL_GREENEST collections) — literally designed for this exact use case.

### 16 precipitation_balance 🟡
Formula still to be decided. "Balance" likely means moderate total rainfall
+ few extreme wet/dry spells, not just a rainy-day count.

- **Dataset:** [ERA5](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels) or [CHIRPS](https://www.chc.ucsb.edu/data/chirps) (~5km resolution, better for rainy-day counting).
- **Method suggestion:** penalize drought days and days over a heavy-rain mm threshold; reward days in a "light rain" band.

### 17 air_quality 🟢
Air pollution level (e.g. PM2.5) per grid cell.

- **Dataset:** [Van Donkelaar et al. global PM2.5 surfaces](https://sites.wustl.edu/acag/datasets/surface-pm2-5/) (~1km, annual, widely used in health research) or [Copernicus CAMS](https://atmosphere.copernicus.eu/)
- Solid, well-established.

### 18 Natural Diaster Risk 🟡

Categorical hazard levels from **[GFDRR ThinkHazard!](https://thinkhazard.org)** (World Bank / GFDRR), fetched via its [public JSON API](https://gfdrr.github.io/thinkhazard/api/). For each of 43,202 divisions (https://gfdrr.github.io/thinkhazard/divisions_flat.json) returned from  the API returns a level (`Very Low`, `Low`, `Medium`, `High`, or `No Data`) per hazard type 

First step is to connect the divisions to actual coordinates using these boundaries: https://datacatalog.worldbank.org/search/dataset/0038272/world-bank-official-boundaries

Then fetch the data from: https://thinkhazard.org/en/report/<id>.json

We encode those as 0–3, aggregate the three flood sub-types into a single `flood` layer, keep the seven hazards that map to `common.NATURAL_DISASTER_DEFAULT_WEIGHTS`, then rasterize country polygons (Natural Earth 50m via `regionmask`) onto the shared 0.5° atlas grid.

The result is combined via `common.compute_natural_disaster_risk`, sign-inverted so higher = safer, and ocean cells are masked using `is_land` from `grid.nc`. Because ThinkHazard reports at ADM0, this is a country-level layer (🔴 Tier C in `DATASETS.md`) — values are flat inside each country border by construction.

### 19 climate_change_risk 🔴
Risk of negative impact from climate change, per country (not current hazard —
that's the separate `natural_disaster_risk` metric).

- **Dataset:** [ND-GAIN Country Index](https://gain.nd.edu/our-work/country-index/) (Notre Dame Global Adaptation Initiative) — annual `[0, 1]` *Vulnerability* score per country, aggregated from exposure, sensitivity, and adaptive capacity across food, water, health, ecosystems, human habitat, and infrastructure. Full yearly CSV bundle downloadable directly.
- **Method:** take the latest available year of `vulnerability.csv`, join to Natural Earth 50m admin_0 polygons by ISO3, rasterize via `regionmask` onto the shared 0.5° grid, sign-invert so higher = safer, mask ocean via `is_land` from `grid.nc`. Country-level — flat inside each border by construction, downgraded to 🔴 Tier C.
- **Originally listed dataset:** [XDI Gross Domestic Climate Risk](https://xdi.systems/news/2024-xdi-gross-domestic-climate-risk-report) — ranks 2,600+ sub-national jurisdictions by 2050 modelled built-environment damage from flooding, forest fires, and sea level rise. Only summary rankings are public; the full dataset is gated behind `media@xdi.systems`, so ND-GAIN was substituted as the closest freely-downloadable equivalent.

---

## Population & Infrastructure

### 21 population_density 🟢
People per km² per grid cell.

- **Dataset:** [GHSL](https://ghsl.jrc.ec.europa.eu/) or [WorldPop](https://www.worldpop.org/) — global, ~100m–1km resolution, yearly.
- Cleanest dataset in the whole list — genuinely gridded, well-maintained.

### 22 light_pollution 🟢
Human-made light emitted per grid cell.

- **Dataset:** [VIIRS Nighttime Lights (DNB)](https://eogdata.mines.edu/products/vnl/), NOAA — global, ~500m resolution, monthly composites, average to yearly.
- Clean and reliable.

### 23 internet_connectivity 🟢
Not in your original list, but worth considering as a modern-livability
proxy with genuinely clean global grid data.

- **Dataset:** [Ookla Speedtest Open Data](https://github.com/teamookla/ookla-open-data) — global, gridded, updated quarterly, free.

### 24 urbanity 🟢
How urban/built-up a grid cell is — distinct from population density
(a dense high-rise district and a sprawling low-rise city can have similar
urbanity but very different density).

---

## Economy & safety

### 31 income 🔴
Average income of residents. Hardest metric to get at grid resolution —
no true global gridded income dataset exists.

- **Dataset:** [Kummu et al. gridded GDP/HDI dataset](https://www.nature.com/articles/sdata20184) (~5–10km resolution) or nightlight-derived income proxies (VIIRS + regression, common in economics literature).
- **Caveat:** expect country/region-level smearing across cells in that area — decide upfront whether that's acceptable.

### 32 cost_of_living 🔴
Cost of a good life in that grid cell.

- **Dataset:** [Numbeo](https://www.numbeo.com/cost-of-living/) — city-level only, requires scraping/API.
- **Method:** snap to nearest city value within a radius, decay/interpolate outward. No raw global raster exists.
- Most manual-effort metric on the list.

### 33 crime_rate 🔴
How violent/unsafe an area is.

- **Dataset:** [UNODC crime statistics](https://dataunodc.un.org/) — country-level, inconsistent reporting methodology across countries.
- Gridded/city-level data only exists for a handful of countries with open crime mapping (US, UK, some EU).
- **Recommendation:** consider keeping this as a country-level modifier and clearly labeling it lower-confidence, rather than presenting it as gridded fact.

### 34 social_freedom 🔴 *(new)*
How free the society living in that area is.

- **Dataset:** [Freedom House](https://freedomhouse.org/report/freedom-world), [V-Dem](https://v-dem.net/), or [Economist Democracy Index](https://www.eiu.com/n/campaigns/democracy-index-2024/)
- Inherently country-level — no sub-national "freedom" data exists in these indices.
- **Recommendation:** apply as a flat modifier per country rather than a true grid metric; document this so it's clear it's not meant to vary within a country's borders.

---

## Urban & cultural



- **Dataset:** [GHSL Built-Up Surface](https://ghsl.jrc.ec.europa.eu/) or [ESA WorldCover](https://esa-worldcover.org/en) land cover classification.
- **Recommendation:** clearly separate this from `population_density` (built-up surface area vs. people/km²) rather than letting them overlap/double-count.

### 41 cultural_attractions 🟡
Number/density of cultural attractions in an area.

- **Dataset:** [OpenStreetMap POIs](https://www.openstreetmap.org/) — tags like `tourism=museum`, `historic=*`, `tourism=attraction`. Free, global.
- **Caveat:** coverage quality varies heavily by country (rich in Europe/US, sparse in parts of Africa/Asia). This will bias results toward "the West has more culture" as a data artifact — worth flagging explicitly in your methodology notes.

### 42 music_and_concerts 🔴
Artists residing in an area, concerts played.

- No global gridded dataset exists for this.
- **Options:**
  1. Drop it.
  2. Scrape [Songkick](https://www.songkick.com/) / [Bandsintown](https://www.bandsintown.com/) APIs for venue/event data — patchy, Western/urban-biased.
  3. **Recommended:** fold into `cultural_attractions` as a sub-tag using OSM's `amenity=music_venue` / `amenity=nightclub` rather than treating it as a standalone metric.

---



## Cross-cutting notes

1. **Tier awareness.** Roughly a third of your metrics (income, cost of
   living, crime, freedom, music & concerts) are Tier C — patchy or
   country-level rather than truly gridded. Document this distinction
   somewhere visible (e.g. in the atlas UI or scoring notebook) so users
   don't assume street-level precision where it doesn't exist.

2. **Country-level bleed-through.** Freedom, and to a lesser extent
   income/cost_of_living/crime, will end up flat or heavily smoothed within
   country borders rather than showing real intra-country variation.

3. **Overlap risk.** Check correlation between `urbanity` vs.
   `population_density`, and `sun_hours` vs. `temperature_pleasantness`,
   before finalizing weights — these pairs risk double-counting similar
   signal in the final weighted score.

4. **Western/urban data bias.** OSM-derived metrics (cultural attractions,
   concerts) and Numbeo-derived ones (cost of living) will systematically
   favor US/Europe due to data availability, independent of actual
   livability. Worth a caveat in your methodology notes.

5. **Yearly averages.** All suggested datasets support yearly aggregation
   (NASA POWER, ERA5, CHIRPS, VIIRS are monthly/daily → average up; GHSL,
   WorldPop, DEM sources are static or annual releases already).