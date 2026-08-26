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

### 22 urbanity 🟡
How urban/built-up a grid cell is — distinct from population density
(a dense high-rise district and a sprawling low-rise city can have similar
urbanity but very different density). Scores higher if there is a big city in the vicinty. also scores higher if the city is considered to be more meaningful

#### Data:
* [Natural Earth 10m populated places](https://naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/) — coords + `POP_MAX` for ~7 300 cities. Base geometry.
* [GaWC "The World According to GaWC" 2024](https://gawc.lboro.ac.uk/gawc-worlds/the-world-according-to-gawc/world-cities-2024/) — 335 world cities ranked Alpha++ … Sufficiency, scraped from the page's `<ul>` blocks with BeautifulSoup and cached as CSV.

#### Method:
GaWC tiers are joined onto Natural Earth by cleaned name (parentheticals stripped, a small alias table for `Bangalore`→`Bengaluru`, `Copenhagen`→`København`, etc.), reaching a ~99 % match rate. Each city's importance is `max(w_tier, w_pop)` where tier weights range 12 (Alpha++) → 1 (Sufficiency) and `w_pop = clip(log10(POP_MAX) − 4, 0, 2)` gives non-GaWC cities a population-based floor. Cities and grid cells are reprojected to Equal Earth (EPSG:8857) so distances are planar metres; a `cKDTree` returns each cell's neighbours within 1 500 km, and urbanity is the exponential-decay sum

    urbanity(cell) = Σ importance_i · exp(−d_i / 220 km)

giving a ~150 km half-life. Ocean cells are masked via `is_land`. Downgraded to 🟡 Tier B because the importance formula and decay length are real methodology choices.

### 23 internet_connectivity 🟢
Not in your original list, but worth considering as a modern-livability
proxy with genuinely clean global grid data.

- **Dataset:** [Ookla Speedtest Open Data](https://github.com/teamookla/ookla-open-data) — global, gridded, updated quarterly, free.

### 24 healthcare_access 🟢
Motorized land travel time (minutes) to the nearest hospital or clinic, from **[Weiss et al. 2020](https://malariaatlas.org/project-resources/accessibility-to-healthcare/)** (MAP / Oxford / Telethon Kids / Google / U. Twente) — a 30 arc-second (~1 km) global GeoTIFF covering 85°N to 60°S, distributed as a zip via the MAP data portal's `DirectDownload` endpoint.

- **Dataset:** `Explorer:2020_motorized_travel_time_to_healthcare` from `data.malariaatlas.org`. A `walking_only` sibling exists for the pedestrian scenario; switch `PRODUCT` in the notebook to score that instead.
- **Method:** stream the raster block-by-block with `rasterio.Window` reads (same pattern as `21_population_density.ipynb`), compute a per-cell mean of `log10(1 + minutes)` across ~3600 source pixels per 0.5° atlas cell, then sign-invert so higher = shorter access = better. The log transform is essential because travel time spans four orders of magnitude between city cores and remote wilderness — an arithmetic mean would let a handful of unreachable pixels dominate a cell that's otherwise well-served.
- Ocean is masked via `is_land` from `grid.nc`; polar cells outside Weiss's ±latitude coverage stay `NaN` and are ignored by `weighted_score`'s per-cell weight renormalization.


### 25 transportation

### 26 water quality

---

## Social & Economy

### 31 income 🔴
Average income of residents. Hardest metric to get at grid resolution —
no true global gridded income dataset exists.

- **Dataset:** [Kummu et al. gridded GDP/HDI dataset](https://www.nature.com/articles/sdata20184) (~5–10km resolution) or nightlight-derived income proxies (VIIRS + regression, common in economics literature).
- **Caveat:** expect country/region-level smearing across cells in that area — decide upfront whether that's acceptable.

### 32 cost_of_living 🔴
Cost of a good life in that grid cell.

- **Dataset:** 
1.[Numbeo](https://www.numbeo.com/cost-of-living/) — city-level only, requires scraping/API.
- **Method:** snap to nearest city value within a radius, decay/interpolate outward. No raw global raster exists.
- Most manual-effort metric on the list.

2. Meta/Data for Good Relative Wealth Index — good for LMIC granularity
Provided for 93 low and middle-income countries at 2.4km resolution, built from satellite imagery, mobile phone network data, and topographic maps, validated against household survey data. Great for sub-national texture in countries where Numbeo has almost no city entries (most of Africa, Central Asia, etc.), but it's relative within-country only — no cross-country comparability, and no coverage for high-income countries.

3. World Bank ICP Price Level Index (PLI) — country-level, but a genuine price-level measure (not just GDP).

### 33 crime_rate 🔴
How violent/unsafe an area is.

- **Country baseline:** [World Bank `VC.IHR.PSRC.P5`](https://data.worldbank.org/indicator/VC.IHR.PSRC.P5) — UNODC intentional homicide rate per 100 000 people, latest available year per country, fetched as JSON from the WDI API. Rasterized by joining ISO3 codes to Natural Earth 50m admin_0 polygons via `regionmask` (same pattern as `19_climate_vulnerability.ipynb`). Homicide is the least-comparable-noisy UNODC series across jurisdictions.
- **City overlay:** [Numbeo Crime Index](https://www.numbeo.com/crime/rankings_current.jsp) — ~400 cities, crowdsourced, city-level index roughly on `[0, 100]` (higher = more crime). Scraped once and cached. Cities are geocoded against Natural Earth 10m populated places using the same cascading `(city, country)` normaliser as `32_cost_of_living.ipynb`.
- **Rescale:** Numbeo and UNODC live on different scales (~`0–100` vs ~`0–40`). A single global linear factor rescales all Numbeo values so `mean(country_means_numbeo) = mean(country_means_unodc)` over the countries covered by both — preserves within- and across-country ordering, but makes the two layers numerically comparable at the country-border seam.
- **Blend:** city layer via `cKDTree` + exponential decay on Equal Earth (EPSG:8857) with a 50 km e-folding / 300 km cutoff, then straight `fillna` onto the UNODC country layer so Numbeo wins where present.
- **Result:** sign-inverted so higher = safer, ocean-masked via `is_land` from `grid.nc`. Still 🔴 Tier C — flat inside country borders wherever Numbeo doesn't reach, and Numbeo itself is crowdsourced with uneven per-city sample size.
- **Not implemented (yet):** FBI NIBRS / police.uk point-level aggregation for cell-resolution US/UK crime, and ACLED for conflict overlay. Both are described in earlier drafts of this section but would each need their own multi-source pipeline.



### 34 human_freedom 🔴
How free the society living in that area is. Blended from two sources so we get both cross-country ranking and some sub-national texture in conflict zones:

- **Country baseline:** **V-Dem [Liberal Democracy Index](https://v-dem.net/) (`v2x_libdem`)**, the composite `[0, 1]` score aggregating elected officials, clean elections, freedoms of association / expression, and legislative + judicial constraints on the executive. Latest year per country (currently 2025). Fetched as the [`vdemdata` GitHub RData asset](https://raw.githubusercontent.com/vdeminstitute/vdemdata/master/data/vdem.RData) — `pyreadr` reads it directly, avoiding the auth-walled Country-Year CSV on `v-dem.net`. Rasterized by joining `country_text_id` (ISO3) to Natural Earth 50m admin_0 polygons via `regionmask`, same pattern as `19_climate_vulnerability.ipynb`. V-Dem's "higher = freer" already matches the atlas convention, so **no sign inversion**.
- **Repression overlay:** **[ACLED](https://acleddata.com)** `Violence against civilians` events from `ACLED_START..ACLED_END` (default 2020–2024), binned onto the 0.5° grid weighted by `fatalities`, transformed as `log10(1 + Σ fatalities)`, and min-max normalized to `[0, 1]`. Log is essential — fatality counts span >4 orders of magnitude between quiet cells and Bucha/Mariupol-scale flashpoints. Fetching requires (free) ACLED registration: set `ACLED_EMAIL`/`ACLED_KEY` env vars for the API path, or manually place `acled_events.csv` in `raw/human_freedom/`. If neither is available, the overlay is all-zero and the layer degrades to a country-flat V-Dem map.
- **Blend:** `freedom(cell) = clip(v2x_libdem_country − ACLED_PENALTY · repression(cell), 0, 1)`. `ACLED_PENALTY = 0.5` is a real methodology choice: it lets Xinjiang, eastern DRC, north-east Nigeria show visibly worse than their country mean without ever flipping a "Not Free" country into "Free" territory. Ocean masked via `is_land` from `grid.nc`.
- **Coverage caveats:** V-Dem covers ~180 countries; small Pacific/Caribbean/Gulf states (Brunei, Belize, Bahamas, Micronesia, most SIDS) are absent and stay `NaN` — `weighted_score`'s per-cell weight renormalization tolerates this. Disputed territories are matched where V-Dem uses standard-adjacent codes (Kosovo `XKX`, Palestine `PSE`) but silently drop where Natural Earth reports `ISO_A3_EH = -99` (Somaliland, N. Cyprus). Still 🔴 Tier C — flat inside each country border by construction wherever ACLED doesn't reach.

Other candidate sources considered but not used: Freedom House FIW, Cato/Fraser HFI, Polity5, RSF, CIVICUS, WJP Rule of Law, Freedom on the Net, Political Terror Scale. V-Dem was picked as the flagship because it is the most methodologically transparent, longest-running, and publishes sub-indices that could later be swapped in without redoing the pipeline.

### 35 corruption 🔴
How much political corruption is present in the society living in that grid cell.

- **Dataset:** **V-Dem [Political Corruption Index](https://v-dem.net/) (`v2x_corr`)** — `[0, 1]` composite of executive, legislative, judicial, and public-sector corruption. Latest year per country (currently 2025). Fetched from the same [`vdemdata` GitHub RData asset](https://raw.githubusercontent.com/vdeminstitute/vdemdata/master/data/vdem.RData) already cached by `34_human_freedom.ipynb`, so no new download.
- **Method:** take the latest available year of `v2x_corr` per `country_text_id` (ISO3), join to Natural Earth 50m admin_0 polygons, rasterize via `regionmask` onto the shared 0.5° grid, **sign-invert** (V-Dem's convention is higher = more corrupt, atlas convention is higher = better), mask ocean via `is_land` from `grid.nc`. Same pattern as `19_climate_vulnerability.ipynb` and `34_human_freedom.ipynb`.
- **Why V-Dem over CPI / WGI:** both Transparency International's CPI (~13 upstream sources) and the World Bank WGI Control of Corruption (~30 upstream sources) are aggregations-of-aggregations that include V-Dem as an input. Using V-Dem directly is more methodologically transparent and reuses infrastructure the atlas already has in place. Sub-indices (`v2x_execorr`, `v2x_pubcorr`, etc.) remain available if we ever want to break the score down further.
- **Coverage caveats:** V-Dem covers ~180 countries; small Pacific / Caribbean / Gulf states (Brunei, Belize, Bahamas, Micronesia, most SIDS) are absent and stay `NaN` — `weighted_score`'s per-cell weight renormalization tolerates this. Country-level — flat inside each country border by construction, 🔴 Tier C.
- **Not used:** Transparency International CPI, World Bank WGI Control of Corruption (`CC.EST`), ICRG Political Risk Services. All would give broadly the same country ranking; the first two are documented above, ICRG is paywalled.

### 36 education — good news, decent resolution

Global Data Lab Subnational HDI / Education Index (globaldatalab.org/shdi) — free, downloadable, covers ~1,700 admin-2 regions in 161 countries, based on mean + expected years of schooling. This is the best option because it's sub-national, not just national.
Kummu et al. gridded HDI/GDP dataset — an actual 5 arc-minute (~9km) raster of HDI (education is one of its three components), covering 1990–2015. This one you could genuinely resample onto your 0.5° grid without a polygon-fill step.
UNESCO UIS also has literacy/enrollment by country if you want a simpler national-only fallback.

### 37 social_connection — weak spatial resolution, national only

Gallup World Poll has social-support questions ("if in trouble, do you have relatives/friends to count on") for ~140 countries since 2005. Free 3-year averages are published via the World Happiness Report data page; full microdata requires institutional access (universities often have it via library subscriptions).
Meta-Gallup State of Social Connections (2022) — free report with loneliness/social-support figures for a smaller set of countries.
There's no subnational or gridded version of either — you'd be painting whole countries the same color.

### 38 worklife_balance — also national only, and narrower coverage

OECD Better Life Index has a "Work-Life Balance" dimension (long working hours %, leisure time) but only covers ~40 OECD + partner countries — most of the world would be blank.
For broader country coverage as a proxy, ILO working-hours statistics (average weekly hours, % working >48h) cover more countries and could substitute or supplement.

---

## Cultural

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

## More Ideas for Datasets

* inflation score
* fresh water availability
* openness of society for strangers
* polital unrest
* satisfaction / happyness of people

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

## Scaling

If you add variables with different scales/variances directly, the weights you *specify* aren't the weights that actually drive the result. A variable with a wide spread (say, 0–10,000) will dominate the sum compared to one with a narrow spread (0–1), even if you give both a weight of 0.5. **Implicit variance dominates explicit weights** unless you normalize first.

### Step 1: Normalize each variable onto a common scale

Common options, in order of how often they're the right choice:

**Z-score standardization** `(x - mean) / std`
- Best default when variables are roughly unimodal/symmetric and you care about "how many standard deviations above/below average."
- Puts everything on mean=0, sd=1, so your weights directly control contribution to variance.

**Min-max scaling** `(x - min) / (max - min)` → [0,1]
- Best when variables have meaningful, known bounds (e.g., a 0–100 test score, a 1–5 rating).
- Sensitive to outliers — one extreme value compresses everything else.

**Rank/percentile transformation**
- Best when distributions are skewed, have outliers, or aren't comparable in nature (e.g., mixing a count variable with a ratio variable).
- Very robust, but you lose information about magnitude of differences.

**Robust scaling** `(x - median) / IQR`
- Like z-score but resistant to outliers — good when your data has heavy tails or a few extreme values you don't want dominating.

Rule of thumb: if any variable is skewed or has outliers, don't use raw min-max or z-score without first checking — either transform (log, etc.) or use rank-based scaling.

### Step 2: Consider the shape of each distribution before you normalize

- **Skewed variables** (income, counts, durations) — consider a log or Box-Cox transform *before* standardizing, otherwise a few outliers stretch the scale and compress everything else near zero.
- **Bounded/ordinal variables** (Likert scales, percentages) — min-max is usually fine and more interpretable than z-scores.
- **Multimodal variables** — z-scores and min-max both struggle here; percentile rank is often safer.

### Step 3: Check correlation between variables before weighting

If two of your scoring variables are highly correlated, adding them with independent weights effectively double-counts that shared signal. Either:
- drop/merge redundant variables,
- or explicitly account for it (e.g., PCA to get orthogonal components, then weight those).

### Step 4: Decide what "weight" should mean

Two different intentions people conflate:
- **Weight = relative importance** → normalize variance to be equal across variables first (z-score), then apply your importance weights. This ensures a weight of 2 really means "twice as important," not "twice as important, further inflated by having a bigger spread."
- **Weight = literal contribution in original units** → don't normalize variance away; weight the raw (or minimally rescaled) values. Rare, but valid if units are genuinely comparable (e.g., all sub-scores are already 0–10 severity ratings).

For the vast majority of "composite score" use cases (KPIs, risk scores, ratings), you want the first: **normalize to equal-variance/equal-range, then apply meaningful weights that sum to 1 (or a fixed total) for easy interpretation.**

### Practical recipe

1. Inspect each variable's distribution (histogram, skew, outliers).
2. Transform skewed variables (log, etc.) if needed.
3. Standardize (z-score for symmetric data, min-max for bounded/interpretable data, robust scaling if outliers present).
4. Check pairwise correlations; address strong redundancy.
5. Apply your weights (ideally summing to 1) and sum.
6. Sanity-check the resulting composite: does its distribution look reasonable? Are a few variables secretly dominating (check each variable's contribution to total variance of the sum)?

If you tell me a bit about your variables — their scales, whether any are skewed/bounded, and how many you're combining — I can give more specific guidance on which normalization to use for each.