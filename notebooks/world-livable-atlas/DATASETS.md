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

### 15 precipitation_balance 🟡
Formula still to be decided. "Balance" likely means moderate total rainfall
+ few extreme wet/dry spells, not just a rainy-day count.

- **Dataset:** [ERA5](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels) or [CHIRPS](https://www.chc.ucsb.edu/data/chirps) (~5km resolution, better for rainy-day counting).
- **Method suggestion:** penalize drought days and days over a heavy-rain mm threshold; reward days in a "light rain" band.

### 16 climate_change_risk 🟡
Risk of negative impact from climate change, per cell (not current hazard —
that's a separate metric, see note below).

- **Dataset:** [WorldClim future climate layers](https://www.worldclim.org/data/cmip6/cmip6climate.html) — CMIP6 projections downscaled to ~1km, gives 2050/2100 deltas vs. today.
- Avoid country-level indices like ND-GAIN/World Bank CCKP for this — they won't give real per-cell variation.
- **Optional addition:** `natural_disaster_risk` (current hazard exposure — earthquake, flood, cyclone, wildfire) via [World Bank/GFDRR ThinkHazard](https://thinkhazard.org/) or NASA/Columbia's Global Multihazard dataset. Distinct from climate *change* risk — worth adding if you want current vs. future risk separated.

### 17 air_quality 🟢
Air pollution level (e.g. PM2.5) per grid cell.

- **Dataset:** [Van Donkelaar et al. global PM2.5 surfaces](https://sites.wustl.edu/acag/datasets/surface-pm2-5/) (~1km, annual, widely used in health research) or [Copernicus CAMS](https://atmosphere.copernicus.eu/)
- Solid, well-established.

---

## Economy & safety

### income 🔴
Average income of residents. Hardest metric to get at grid resolution —
no true global gridded income dataset exists.

- **Dataset:** [Kummu et al. gridded GDP/HDI dataset](https://www.nature.com/articles/sdata20184) (~5–10km resolution) or nightlight-derived income proxies (VIIRS + regression, common in economics literature).
- **Caveat:** expect country/region-level smearing across cells in that area — decide upfront whether that's acceptable.

### cost_of_living 🔴
Cost of a good life in that grid cell.

- **Dataset:** [Numbeo](https://www.numbeo.com/cost-of-living/) — city-level only, requires scraping/API.
- **Method:** snap to nearest city value within a radius, decay/interpolate outward. No raw global raster exists.
- Most manual-effort metric on the list.

### crime_rate 🔴
How violent/unsafe an area is.

- **Dataset:** [UNODC crime statistics](https://dataunodc.un.org/) — country-level, inconsistent reporting methodology across countries.
- Gridded/city-level data only exists for a handful of countries with open crime mapping (US, UK, some EU).
- **Recommendation:** consider keeping this as a country-level modifier and clearly labeling it lower-confidence, rather than presenting it as gridded fact.

### freedom 🔴 *(new)*
How free the society living in that area is.

- **Dataset:** [Freedom House](https://freedomhouse.org/report/freedom-world), [V-Dem](https://v-dem.net/), or [Economist Democracy Index](https://www.eiu.com/n/campaigns/democracy-index-2024/)
- Inherently country-level — no sub-national "freedom" data exists in these indices.
- **Recommendation:** apply as a flat modifier per country rather than a true grid metric; document this so it's clear it's not meant to vary within a country's borders.

---

## Urban & cultural

### urbanity 🟢
How urban/built-up a grid cell is — distinct from population density
(a dense high-rise district and a sprawling low-rise city can have similar
urbanity but very different density).

- **Dataset:** [GHSL Built-Up Surface](https://ghsl.jrc.ec.europa.eu/) or [ESA WorldCover](https://esa-worldcover.org/en) land cover classification.
- **Recommendation:** clearly separate this from `population_density` (built-up surface area vs. people/km²) rather than letting them overlap/double-count.

### cultural_attractions 🟡
Number/density of cultural attractions in an area.

- **Dataset:** [OpenStreetMap POIs](https://www.openstreetmap.org/) — tags like `tourism=museum`, `historic=*`, `tourism=attraction`. Free, global.
- **Caveat:** coverage quality varies heavily by country (rich in Europe/US, sparse in parts of Africa/Asia). This will bias results toward "the West has more culture" as a data artifact — worth flagging explicitly in your methodology notes.

### music_and_concerts 🔴
Artists residing in an area, concerts played.

- No global gridded dataset exists for this.
- **Options:**
  1. Drop it.
  2. Scrape [Songkick](https://www.songkick.com/) / [Bandsintown](https://www.bandsintown.com/) APIs for venue/event data — patchy, Western/urban-biased.
  3. **Recommended:** fold into `cultural_attractions` as a sub-tag using OSM's `amenity=music_venue` / `amenity=nightclub` rather than treating it as a standalone metric.

---

## Population

### population_density 🟢
People per km² per grid cell.

- **Dataset:** [GHSL](https://ghsl.jrc.ec.europa.eu/) or [WorldPop](https://www.worldpop.org/) — global, ~100m–1km resolution, yearly.
- Cleanest dataset in the whole list — genuinely gridded, well-maintained.

### light_pollution 🟢
Human-made light emitted per grid cell.

- **Dataset:** [VIIRS Nighttime Lights (DNB)](https://eogdata.mines.edu/products/vnl/), NOAA — global, ~500m resolution, monthly composites, average to yearly.
- Clean and reliable.

### *(optional addition)* internet_connectivity 🟢
Not in your original list, but worth considering as a modern-livability
proxy with genuinely clean global grid data.

- **Dataset:** [Ookla Speedtest Open Data](https://github.com/teamookla/ookla-open-data) — global, gridded, updated quarterly, free.

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