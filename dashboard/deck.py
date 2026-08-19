import requests
import numpy as np
import dash
import dash_deck
from dash import html
import copy
from pyproj import Transformer
import pydeck as pdk

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
    "+proj=natearth +lon_0=0 +datum=WGS84 +units=m +no_defs",
    always_xy=True  # ensures input order is (lng, lat), not (lat, lng)
)


def project_coordinates(coords):
    """Recursively walk a GeoJSON coordinates array and reproject each [lng, lat] pair to cartesian coordinates"""
    if isinstance(coords[0], (int, float)):
        x, y = transformer.transform(coords[0], coords[1])
        return [x, -y]
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
    }
],


view = pdk.View(
    type="OrthographicView",
    controller=True,   # pan + zoom only, no rotation possible
)

deck = pdk.Deck(
    layers=data_layers,
    initial_view_state=pdk.ViewState(
        target=[0, -1000000, 0],
        zoom=-15.2,
        rotationX=90
    ),
    views=[view],
    map_provider=None,  # no basemap for a pure Cartesian scene
)

deck_component = dash_deck.DeckGL(
    deck.to_json(),
    id="deck-gl",
    style={"width": "90%", "left": "5%", "height": "500px", "top": "100px", "border": "1px solid black"},
)

app = dash.Dash(__name__)

app.layout = html.Div([
    html.H1(children='World Livable Atlas', style={'textAlign': 'center'}),
    html.Div(deck_component)
])

if __name__ == "__main__":
    app.run(debug=True)