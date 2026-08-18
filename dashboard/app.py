import dash
from dash import dcc, html
import plotly.graph_objects as go
import pandas as pd
import numpy as np

app = dash.Dash(__name__)

df = pd.read_parquet("../data/world-livable-atlas/processed/normalized_by_country.parquet")
# print(df)

fig = go.Figure(go.Scattergeo())

# fig.add_trace(go.Scattergeo(
#     lon=df['lon'],
#     lat=df['lat'],
#     mode="markers",
#     marker=dict(
#         size=10 * np.cos(np.radians(df['lat'])),
#         colorscale="Viridis",
#         sizemode="area",         # important: 'area' scaling matches the cos(lat) area logic
#     )
# ))

fig.update_geos(
    showcountries=True,
    showcoastlines=True,
    showland=True,
    landcolor="rgb(230, 230, 230)",
    countrycolor="rgb(120, 120, 120)",
    projection_type="natural earth",
    lonaxis=dict(
        showgrid=True,
        dtick=10,
        gridcolor="rgba(0,0,0,0.1)",
        gridwidth=0.5
    ),
    lataxis=dict(
        showgrid=True,
        dtick=10,
        gridcolor="rgba(0,0,0,0.1)",
        gridwidth=0.5
    )
)
fig.update_layout(margin={"r": 0, "t": 0, "l": 0, "b": 0})

app.layout = html.Div([
    html.H1(children='World Livable Atlas', style={'textAlign':'center'}),
    dcc.Graph(
        figure=fig,
        style={'height': '500px'},
        config={'scrollZoom': True}
    )
])

if __name__ == '__main__':
    app.run(debug=True)