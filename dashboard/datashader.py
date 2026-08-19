"""
Datashader + Dash example: rendering 80k+ geo points performantly.

Approach:
  1. Keep the raw point data (lon/lat + optional category/value column) in a
     pandas/dask DataFrame.
  2. On each callback (pan/zoom/filter), use datashader to rasterize the
     *currently visible* points into a small PNG image (a few hundred px,
     not 80k SVG/WebGL objects).
  3. Overlay that PNG on a Plotly Mapbox/Maplibre figure using layout.images,
     positioned to match the current map extent.

This keeps the browser only ever drawing one image, regardless of whether
you have 80k or 8 million points feeding it.

Install:
    pip install dash plotly datashader pandas numpy pillow
"""

import io
import base64

import numpy as np
import pandas as pd
import datashader as ds
import datashader.transfer_functions as tf
from PIL import Image
import math

import dash
from dash import dcc, html, Input, Output
import plotly.graph_objects as go


# ---------------------------------------------------------------------------
# 1. Fake data — replace with your real 80k-row DataFrame (columns: lon, lat)
# ---------------------------------------------------------------------------
N = 80_000
rng = np.random.default_rng(0)
df = pd.DataFrame({
    "lon": rng.normal(loc=-98.5, scale=15, size=N),   # roughly continental US
    "lat": rng.normal(loc=39.8, scale=8, size=N),
    "value": rng.random(N),  # optional: color by this
})


# ---------------------------------------------------------------------------
# 2. Helper: rasterize a lon/lat DataFrame slice into a base64 PNG
# ---------------------------------------------------------------------------
def rasterize(data: pd.DataFrame, x_range, y_range, plot_width=2000, plot_height=2000):
    if data.empty:
        return None

    cvs = ds.Canvas(
        plot_width=plot_width,
        plot_height=plot_height,
        x_range=x_range,
        y_range=y_range,
    )
    # aggregate by count (swap to ds.mean("value") etc. if you want to color
    # by a data column instead of density)
    agg = cvs.points(data, "lon", "lat", ds.count())

    # tf.shade() already returns an RGBA image with transparent (alpha=0)
    # pixels wherever there's no data, so no separate background step needed.
    img = tf.shade(agg, cmap=["lightblue", "darkblue", "red"], how="log")

    # By default each point is a single pixel — spread them out so
    # individual points are actually visible (bigger "dot" size).
    # dynspread automatically shrinks the radius in dense areas so they
    # don't all merge into a blob; px sets the max radius in pixels.
    img = tf.spread(img, px=2)

    pil_img = img.to_pil()

    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    encoded = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/png;base64,{encoded}"


# ---------------------------------------------------------------------------
# 3. Base map figure (no per-point traces at all — image layer only)
# ---------------------------------------------------------------------------
def make_figure(x_range, y_range, img_uri):
    fig = go.Figure()

    # Dummy trace so Plotly actually registers a mapbox subplot.
    # Without at least one mapbox-type trace, the mapbox layout/tiles/
    # image layer can silently fail to render.
    fig.add_trace(
        go.Scattermapbox(
            lon=[(x_range[0] + x_range[1]) / 2],
            lat=[(y_range[0] + y_range[1]) / 2],
            mode="markers",
            marker=dict(size=1, opacity=0),
            hoverinfo="skip",
            showlegend=False,
        )
    )

    fig.update_layout(
        mapbox=dict(
            style="carto-positron",  # no token needed
            center=dict(
                lon=(x_range[0] + x_range[1]) / 2,
                lat=(y_range[0] + y_range[1]) / 2,
            ),
            zoom=3,
        ),
        margin=dict(l=0, r=0, t=0, b=0),
        uirevision="keep",  # preserve zoom/pan state across callbacks
    )

    if img_uri:
        fig.update_layout(
            mapbox=dict(
                layers=[
                    dict(
                        sourcetype="image",
                        source=img_uri,
                        coordinates=[
                            [x_range[0], y_range[1]],  # top-left
                            [x_range[1], y_range[1]],  # top-right
                            [x_range[1], y_range[0]],  # bottom-right
                            [x_range[0], y_range[0]],  # bottom-left
                        ],
                    )
                ],
                style="carto-positron",
                center=dict(
                    lon=(x_range[0] + x_range[1]) / 2,
                    lat=(y_range[0] + y_range[1]) / 2,
                ),
                zoom=3,
            )
        )

    return fig


# ---------------------------------------------------------------------------
# 4. Dash app
# ---------------------------------------------------------------------------
app = dash.Dash(__name__)

initial_x_range = (df["lon"].min(), df["lon"].max())
initial_y_range = (df["lat"].min(), df["lat"].max())
initial_img = rasterize(df, initial_x_range, initial_y_range)

# --- debug: confirm the image was actually generated ---
if initial_img is None:
    print("rasterize() returned None — df was empty or aggregation failed")
else:
    print(f"rasterize() OK, data URI length: {len(initial_img)}")
    # save a copy so you can open it directly and eyeball it
    header, encoded = initial_img.split(",", 1)
    with open("debug_raster.png", "wb") as f:
        f.write(base64.b64decode(encoded))
    print("Saved debug_raster.png — open it to confirm points are visible")

app.layout = html.Div([
    html.H3("80k points rasterized with Datashader"),
    dcc.Graph(
        id="map",
        figure=make_figure(initial_x_range, initial_y_range, initial_img),
        style={"height": "80vh"},
    ),
    # stash the current data range client-side so callback can re-rasterize
    dcc.Store(id="range-store", data={"x": initial_x_range, "y": initial_y_range}),
])


@app.callback(
    Output("map", "figure"),
    Input("map", "relayoutData"),
    prevent_initial_call=True,
)
def update_on_pan_zoom(relayout_data):
    """Re-rasterize whenever the user pans or zooms, updating ONLY the
    image layer via Patch — never rebuilding the whole figure, so Plotly
    doesn't reset center/zoom back to defaults."""
    if not relayout_data:
        raise dash.exceptions.PreventUpdate

    # mapbox._derived.coordinates gives the 4 corner [lon, lat] pairs of
    # the current viewport: [top-left, top-right, bottom-right, bottom-left]
    derived = relayout_data.get("mapbox._derived")
    if derived and "coordinates" in derived:
        coords = derived["coordinates"]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        x_range = (min(lons), max(lons))
        y_range = (min(lats), max(lats))
    else:
        # relayoutData without _derived (e.g. some drag events) — nothing
        # to re-rasterize against yet, skip this update
        raise dash.exceptions.PreventUpdate

    # For very large datasets, filter df to the visible bbox here before
    # rasterizing so you're not re-aggregating all 80k points every pan:
    # visible = df[df.lon.between(*x_range) & df.lat.between(*y_range)]
    img_uri = rasterize(df, x_range, y_range)

    patched_fig = dash.Patch()
    patched_fig["layout"]["mapbox"]["layers"] = [
        dict(
            sourcetype="image",
            source=img_uri,
            coordinates=[
                [x_range[0], y_range[1]],
                [x_range[1], y_range[1]],
                [x_range[1], y_range[0]],
                [x_range[0], y_range[0]],
            ],
        )
    ] if img_uri else []
    return patched_fig


if __name__ == "__main__":
    app.run(debug=True)