# Project Description

|  |  |
| --- | --- |
| Name | World Liveable Atlas |
| Description | Lorem ipsum |

## Datasets


## Geography & environment

**Closeness to water / mountains**
- OpenStreetMap (via the Overpass API or the `osmnx` Python library) has coastlines, rivers, lakes, and elevation-tagged features — free and global.
- For elevation/terrain (to derive "mountainous"), use NASA's SRTM or ETOPO1 digital elevation data. You can compute local terrain ruggedness from these rasters.
- Natural Earth (naturalearthdata.com) is great for simplified coastlines/water bodies at a global scale if you don't need OSM's precision.

**Climate (current)**
- WorldClim (worldclim.org) — gridded historical climate averages (temperature, precipitation) worldwide, free download.
- Köppen-Geiger climate classification datasets (there are pre-computed global raster versions) if you want categorical climate types rather than raw numbers.

**Climate change / future risk**
- CMIP6 climate projections (via Copernicus Climate Data Store or NASA NEX-GDDP) for future temperature/precip trends.
- Notre Dame Global Adaptation Initiative (ND-GAIN) has a country-level climate vulnerability index — much easier to work with than raw climate models if you want something simple.
- Climate Central or World Bank Climate Change Knowledge Portal for additional risk indicators (flooding, heat days, etc.)

## Economic

**Income**
- World Bank Open Data (GDP per capita, by country).
- For sub-national/city-level: Eurostat (Europe), U.S. Census/BLS (US), or Numbeo (crowdsourced, global, city-level).

**Living costs**
- Numbeo (numbeo.com) is the standard here — crowdsourced cost-of-living indices by city, with an API for scraping if you're careful about rate limits.
- Expatistan is a similar alternative.

## Environment & safety

**Air quality**
- OpenAQ (openaq.org) — free, real-time and historical air quality data from monitoring stations worldwide, has an API.
- WHO Global Ambient Air Quality Database for broader coverage.

**Crime rate**
- This is the hardest to get consistently — crime stats aren't standardized globally.
- UNODC (UN Office on Drugs and Crime) has country-level data.
- Numbeo again has a crowdsourced city-level Safety Index.
- For specific countries, national police/statistics agencies (e.g., FBI UCR for the US, Eurostat for the EU) are more reliable if you're focusing regionally.

## Urban / cultural

**Closeness to a bigger city**
- Derivable yourself: take a list of city coordinates + population (GeoNames or the Natural Earth "populated places" dataset) and compute distances from any point.

**Cultural attractions**
- OpenStreetMap tags (museum, theatre, gallery, artwork, etc.) via Overpass — gives you a density count per area.
- Wikidata/Wikipedia (via SPARQL queries) has structured data on landmarks and cultural sites globally.

**Concerts / live music**
- Trickiest one — no clean global dataset. Songkick and Bandsintown have APIs but are geared toward event listings, not historical density. You'd likely use them as a proxy (e.g., "number of upcoming shows in radius X") rather than a historical dataset.

## A few structural decisions to make early

1. **Resolution**: Are you scoring countries, cities, or an actual grid (e.g., 0.5°×0.5° cells) across the globe? Grid gives you the nicest map but means every dataset needs to be spatially joined/interpolated to that grid.
2. **Normalization & weighting**: You'll want to normalize each variable (0–1 scale) and let yourself set personal weights (e.g., "air quality matters more to me than concerts") — this is really the core of the "personal taste" part.
3. **City-level vs point-level**: Numbeo/crime/cost-of-living data is usually per-city, while climate/terrain is continuous. You'll likely end up anchoring everything to a city list and computing surrounding-area scores from there, which is simpler than a full continuous grid.

Want me to help you set up an actual project scaffold — e.g., a Python pipeline that pulls a few of these sources, builds a scoring dataframe, and renders a choropleth/heatmap you can tune interactively?