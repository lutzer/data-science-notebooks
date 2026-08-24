import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";
 
// Raw sample data — just plain numbers, no manual binning needed
const rawData = [
  12, 15, 18, 22, 24, 25, 28, 30, 31, 33, 35, 36, 38, 40, 41, 42, 44, 45, 47,
  48, 50, 52, 53, 55, 58, 60, 62, 65, 68, 70, 72, 75, 78, 80, 33, 36, 42, 45,
  48, 50, 52, 55, 58, 40, 41, 43, 46, 49, 51, 54,
];
 
export default function PlotlyHistogram() {
  const chartRef = useRef(null);
 
  useEffect(() => {
    const trace = {
      x: rawData,
      type: "histogram",
      nbinsx: 8, // ask for ~8 bins; Plotly picks nice edges
      marker: {
        color: "#6366f1",
        line: { color: "white", width: 1 },
      },
      hovertemplate: "Range: %{x}<br>Count: %{y}<extra></extra>",
    };
 
    const layout = {
      margin: { t: 10, r: 20, l: 50, b: 50 },
      xaxis: { title: "Value", gridcolor: "#eee" },
      yaxis: { title: "Frequency", gridcolor: "#eee" },
      plot_bgcolor: "white",
      paper_bgcolor: "white",
      bargap: 0.05,
      font: { color: "#374151", size: 12 },
      autosize: true,
    };
 
    Plotly.newPlot(chartRef.current, [trace], layout, {
      responsive: true,
      displayModeBar: false,
    });
 
    // Clean up the chart on unmount
    return () => {
      if (chartRef.current) Plotly.purge(chartRef.current);
    };
  }, []);
 
  return (
    <div className="w-full bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">
        Value Distribution
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Histogram built with Plotly — raw values in, automatic binning
      </p>
      <div ref={chartRef} style={{ width: "100%", height: "360px" }} />
    </div>
  );
}