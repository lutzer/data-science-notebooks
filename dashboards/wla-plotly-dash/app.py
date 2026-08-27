import requests
import numpy as np
import dash
import dash_deck
from dash import html, dcc, Input, Output, ALL
import copy
from pyproj import Transformer
import pydeck as pdk
import pandas as pd
from matplotlib import colormaps
from pathlib import Path

VIRIDIS = colormaps["viridis"]

def viridis_rgba(values):
    """Map a 0-1 array of scalars to viridis [R, G, B, A] byte lists."""
    clipped = np.clip(np.asarray(values, dtype=float), 0.0, 1.0)
    rgba = (VIRIDIS(clipped) * 255).astype(int)
    return rgba.tolist()

BASE_DIR = Path(__file__).resolve().parent

# 1. Load world geojson with population data (Natural Earth 110m countries)
GEOJSON_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/"
    "master/geojson/ne_110m_admin_0_countries.geojson"
)
geojson = requests.get(GEOJSON_URL).json()

# filter out antarctica
geojson["features"] = [
    feature for feature in geojson["features"]
    if feature["properties"].get("ADMIN") != "Antarctica"
]

# Natural Earth projection (PROJ has this built in natively)
transformer = Transformer.from_crs(
    "EPSG:4326",  # WGS84 lng/lat
    "+proj=natearth +lon_0=0 +datum=WGS84 +units=km +no_defs",
    always_xy=True  # ensures input order is (lng, lat), not (lat, lng)
)

def transform_coordinates(lon,lat):
    x, y = transformer.transform(lon, lat)
    return [x, -y]

def project_coordinates(coords):
    """Recursively walk a GeoJSON coordinates array and reproject each [lng, lat] pair to cartesian coordinates"""
    if isinstance(coords[0], (int, float)):
        return transform_coordinates(coords[0], coords[1])
    return [project_coordinates(c) for c in coords]

def reproject_geometry(geometry):
    if geometry is None:
        return
    if geometry["type"] == "GeometryCollection":
        for geom in geometry["geometries"]:
            reproject_geometry(geom)
    else:
        geometry["coordinates"] = project_coordinates(geometry["coordinates"])


def reproject_geojson(geojson):
    """Reproject an entire GeoJSON FeatureCollection/Feature/Geometry to Natural Earth."""
    clone = copy.deepcopy(geojson)

    if clone["type"] == "FeatureCollection":
        for feature in clone["features"]:
            reproject_geometry(feature["geometry"])
    elif clone["type"] == "Feature":
        reproject_geometry(clone["geometry"])
    else:
        reproject_geometry(clone)

    return clone


# Actually use the projected geometry now
geojson_projected = reproject_geojson(geojson)

# load data
data_file_path = BASE_DIR / ".." / ".." / "data" / "world-livable-atlas" / "processed" / "dashboard_data.parquet"
df = pd.read_parquet(data_file_path)

def reproject_df_row(row):
    x, y = transform_coordinates(row["_lon"], row["_lat"])
    return pd.Series({
        'x': x,
        'y': y
    })

df[["x","y"]] = df.apply(reproject_df_row, axis=1)

value_columns = [c for c in df.columns if c not in {"x", "y", "_lon", "_lat", "_country_code", "_continent", "_region_code", "_region_name"}]
WEIGHTED_SCORE = "weighted_score"
default_column = WEIGHTED_SCORE

def compute_weighted_score(weights):
    """Return a Series holding the weight-normalised sum of all value columns.

    `weights` is a dict mapping column name -> weight (from the sliders). NaN
    values in any column are skipped per-row: both the weighted sum and the
    weight total are computed only across the columns that have a value for
    that row, so missing metrics neither pull the score toward zero nor
    inflate the denominator. Rows with no data at all yield NaN.
    """
    active = {c: w for c, w in weights.items() if w and c in df.columns}
    if not active:
        return pd.Series(np.nan, index=df.index)
    values = df[list(active.keys())]
    weight_series = pd.Series(active)
    mask = values.notna()
    weighted = values.mul(weight_series, axis=1).fillna(0).sum(axis=1)
    total = mask.mul(weight_series, axis=1).sum(axis=1)
    score = weighted.where(total > 0) / total.replace(0, np.nan)
    lo, hi = score.min(), score.max()
    if pd.isna(lo) or hi == lo:
        return score
    return (score - lo) / (hi - lo)

def build_deck(column, view, weights=None):
    if column == WEIGHTED_SCORE:
        score = compute_weighted_score(weights or {})
        frame = df[["x", "y"]].assign(value=score)
    else:
        frame = df[["x", "y", column]].rename(columns={column: "value"})
    frame = frame.dropna()
    frame["color"] = viridis_rgba(frame["value"].to_numpy())
    points = frame.to_dict("records")

    # 3. Build the deck.gl layer spec.
    data_layers = [
        {
            "@@type": "GeoJsonLayer",
            "id": "choropleth-layer",
            "data": geojson_projected,
            "filled": True,
            "stroked": True,
            "getFillColor": [0, 0, 0, 10],
            "getLineColor": [0, 0, 0, 255],
            "lineWidthMinPixels": 0.5
        },
        {
            "@@type": "ScatterplotLayer",
            "id": "scatter-layer",
            "data": points,          # list of dicts, or a DataFrame-derived list
            "getPosition": "@@=[x, y]",  # note the string expression syntax
            "getRadius": 40,
            "getFillColor": "@@=color",
            "getLineColor": [0, 0, 0],
            "filled": True,
            "stroked": False,
            "pickable": False,
            "opacity": 0.3,
            "radiusScale": 1,
            "radiusMinPixels": 0.5,
            "radiusMaxPixels": 60,
            "lineWidthMinPixels": 1,
        }
    ]

    deck = pdk.Deck(
        layers=data_layers,
        initial_view_state=pdk.ViewState(
            target=[1000, -1000, 0],
            zoom=-5,
            rotationX=90
        ),
        views=[view],
        map_provider=None,  # no basemap for a pure Cartesian scene
    )
    
    return deck.to_json()


def build_sliders(columns):

    def create_slider(column):
        return html.Div([
            html.Label(column),
            dcc.Slider(0, 2, 0.1, value=1, id={"type": "column-slider", "index": column}),
        ])

    return html.Div(children=[create_slider(c) for c in columns], style={"margin-top": "800px"})


orthographic_view = pdk.View(
    type="OrthographicView",
    controller=True,   # pan + zoom only, no rotation possible
)

initial_weights = {c: 1 for c in value_columns}

deck_component = dash_deck.DeckGL(
    build_deck(default_column, orthographic_view, initial_weights),
    id="deck-gl",
    style={"width": "90%", "left": "5%", "height": "500px", "top": "200px", "border": "1px solid black"},
)

dropdown_options = [{"label": "Weighted score (sliders)", "value": WEIGHTED_SCORE}] + \
    [{"label": c, "value": c} for c in value_columns]

app = dash.Dash(__name__)

app.layout = html.Div([
    html.H1(children='World Livable Atlas', style={'textAlign': 'center'}),
    html.Div(
        dcc.Dropdown(
            id="column-dropdown",
            options=dropdown_options,
            value=default_column,
            clearable=False,
            style={"width": "300px", "margin": "10px auto"}
        )
    ),
    build_sliders(value_columns),
    html.Div(deck_component),
])

@app.callback(
    Output("deck-gl", "data"),
    Input("column-dropdown", "value"),
    Input({"type": "column-slider", "index": ALL}, "value"),
    Input({"type": "column-slider", "index": ALL}, "id"),
)
def update_deck(selected, slider_values, slider_ids):
    weights = {sid["index"]: v for sid, v in zip(slider_ids, slider_values)}
    return build_deck(selected, orthographic_view, weights)

if __name__ == "__main__":
    app.run(debug=True)