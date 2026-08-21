import requests
import numpy as np
import dash
import dash_deck
from dash import html, dcc, Input, Output, ALL
import copy
from pyproj import Transformer
import pydeck as pdk
import pandas as pd
from pathlib import Path

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
data_file_path = BASE_DIR / ".." / ".." / "data" / "world-livable-atlas" / "processed" / "normalized_by_country.parquet"
df = pd.read_parquet(data_file_path)

def reproject_df_row(row):
    x, y = transform_coordinates(row["lon"], row["lat"])
    return pd.Series({
        'x': x,
        'y': y
    })

df[["x","y"]] = df.apply(reproject_df_row, axis=1)

value_columns = [c for c in df.columns if c not in {"x", "y", "lon", "lat","country_code","continent"}]
default_column = "sea_proximity"

def build_deck(column, view):
    points = df[["x", "y", column]].rename(columns={column: "value"}).dropna().to_dict("records")

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
            "getFillColor": "@@=[value * 255, 0, 255 - value * 255, 255]",
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

deck_component = dash_deck.DeckGL(
    build_deck(default_column, orthographic_view),
    id="deck-gl",
    style={"width": "90%", "left": "5%", "height": "500px", "top": "200px", "border": "1px solid black"},
)

app = dash.Dash(__name__)

app.layout = html.Div([
    html.H1(children='World Livable Atlas', style={'textAlign': 'center'}),
    html.P(id="output", children="text"),
    html.Div(
        dcc.Dropdown(
            id="column-dropdown",
            options=[{"label": c, "value": c} for c in value_columns],
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
    Input("column-dropdown", "value")
)
def update_column(selected):
    return build_deck(selected, orthographic_view)

@app.callback(
    Output("output", "children"),
    Input({"type": "column-slider", "index": ALL}, "value"),
)
def on_any_slider_change(values):
    # `values` is a list of all slider values, in the order they appear in the layout
    # dash.callback_context tells you which one triggered it
    return f"all values: {values}"

if __name__ == "__main__":
    app.run(debug=True)