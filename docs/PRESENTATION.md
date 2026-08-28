# World Liveable Atlas Präsentation

## Beschreibung 

Erstellung eines World Livability Index auf Basis von mehreren gewichteten Scores. Die Weltkarte wird in ein Grid aufgeteilt (0.5 lat * 0,5 lon pro zelle). Für jede dieser Zellen wird eine Score erstellt, welche nach persönlicher Präferenz ermittelt wie attraktiv diese grid zelle ist um dort zu leben. Die Daten werden mittels eines interaktiven Dashboards visualisiert. Das Dashboard erlaubt es eine eigene Präferenz zu erstellen, indem die verschiedenen Einzelscores mit verschiedenen Gewichtungen versehen werden.


## Datensätze

### Environment

| **#** | **Variable**             | **Source**                                                   |
| ----- | ------------------------ | ------------------------------------------------------------ |
| 11    | sea_proximity            | Natural Earth 10m coastlines / OSM coastline extracts        |
| 12    | terrain_ruggedness       | Copernicus GLO-30 DEM (fallback: SRTM)                       |
| 13    | sun_hours                | NASA POWER API                                               |
| 14    | temperature_pleasantness | ERA5 reanalysis (Copernicus CDS) — apparent temperature      |
| 15    | annual_greenness         | MODIS MOD13Q1/A1 NDVI composites                             |
| 16    | precipitation_balance    | ERA5 / CHIRPS monthly precipitation                          |
| 17    | air_quality              | Van Donkelaar et al. global PM2.5 surfaces (WUSTL ACAG)      |
| 18    | natural_disaster_risk    | GFDRR ThinkHazard! JSON API + World Bank official boundaries |
| 19    | climate_vulnerability    | ND-GAIN Country Index (vulnerability.csv)                    |

### Population & Infrastructure

| **#** | **Variable**          | **Source**                                                   |
| ----- | --------------------- | ------------------------------------------------------------ |
| 21    | population_density    | GHSL / WorldPop                                              |
| 22    | urbanity              | Natural Earth 10m populated places + GaWC World Cities 2024  |
| 23    | internet_connectivity | Ookla Speedtest Open Data                                    |
| 24    | healthcare_access     | Weiss et al. 2020 motorized travel-time raster (Malaria Atlas Project) |

### Social & Economy

| **#** | **Variable**       | **Source**                                                   |
| ----- | ------------------ | ------------------------------------------------------------ |
| 31    | income             | Kummu et al. gridded GDP/HDI dataset                         |
| 32    | cost_of_living     | Numbeo (city-level, scraped) — with Meta RWI + World Bank ICP as candidates |
| 33    | crime_rate         | World Bank VC.IHR.PSRC.P5 (UNODC homicides) + Numbeo Crime Index city overlay |
| 34    | human_freedom      | V-Dem v2x_libdem (via vdemdata RData) + ACLED "violence against civilians" |
| 35    | corruption         | V-Dem v2x_corr (reuses the same vdemdata cache as 34)        |
| 36    | `education`        | GDL Subnational HDI v8.3 (Education Index) + GDL Shapefiles v6.5, via Zenodo mirror |
| 37    | `people_happiness` | World Happiness Report 2026 Figure 2.1 (Cantril ladder 3-year average per country) |
| 38    | `working_hours`    | ILOSTAT `HOW_2EMP_SEX_NB_A` — Average weekly hours actually worked per employed person (ILO Modelled Estimates) |


## Projectstruktur

```
.
├── data/ 
		└── processed 
		└── raw
├── dashboards/
│   └── wla-react-dashboard/          
├── notebooks/
│   └── world-livable-atlas/
```

## Analyse

### Vorgehen

1. Grid Erstellung
2. Datascraping
3. Transformation auf Grid
4. Normalisierung
5. Scoring

#### Notizen 

* Zur Erstellung der Analyse habe ich zur Hilfe oft KI Werkzeuge benutzt um die Datenmenge in der kurzen Projekt-Dauer beherschen zu können.
* Erster Schritt ist die Grid erstellung zur Unterteilung der Erde in Scoring Zellen.
* Datascraping von vielen unterschiedlichen Quellen: Größte Schwierigkeit war die Transformation der Datensätze in benutzbare Daten. 
* Zwei arten von Daten: Satelittendaten die relativ einfach auf mein Grid übertragbar sind und Country or Region Data die in Polygonen auf das grid projeziert werden
* Am Ende müssen die unterschiedlichen Daten normalisiert werden um sie vergleichbar zu machen
* Nach der Normalisierung werden die verschiedenen Daten gewichtet und eine gesammt Score für jede Zelle berechnet.
* Viele Datenquellen sind westlich zentriert und nicht wirklich nutzbar für meinen Atlas, da die Daten entweder unvollständig sind oder ungleichmäßige Datebverteilung existiert: z.b. bei Essen, Kulturellen Veranstaltungen, Music, Social Connections, etc ...

### Analysepipeline

```
- `0x_` — basis, main, grid, regionmask
- `1x_` — datascraping geography & klima
- `2x_` — datascraping bevölkerung & infrastructure
- `3x_` — datascraping social & ökonomisch
- `9x_` — datascraping anaylse synthesis
- common.py - common functions
```

## Visualisierung

### Plotly Visualisierung

* plotly scatterplots sind sher langsam, daher habe ich deck.gl benutzt. aber das hat limiterungen wenn man es zusammen mit plotly benutzt. nicht alle optionen sind möglich
* Ausserdem duaert es relativ lang die score neu zu berechnen, da die daten jedesmal vom python server wieder an das frontend geschickt werden
* mercator projection hat mir nicht gefallen. Ich wollte die euqal erath Projection benutzen

### React App + deck.gl + recharts

* React app mit recharts für plots und deck.gl für die interaktive karte schien die einfachste Möglichkeit
* Daten Reaktivität durch React useStates
* Auto deployed mit github actions




