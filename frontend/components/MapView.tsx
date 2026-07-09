"use client";

import { Fragment } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import type { Hotspot } from "@/lib/types";
import { LEVEL_COLORS } from "@/lib/api";

interface MapViewProps {
  center: { lat: number; lng: number };
  hotspots: Hotspot[];
}

// Radius scales with pollution so critical spots read bigger.
function radiusFor(pm25: number): number {
  return 10 + Math.min(pm25, 160) / 6;
}

export default function MapView({ center, hotspots }: MapViewProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      zoomControl={false}
      scrollWheelZoom
      className="h-full w-full"
    >
      {/* CartoDB Dark Matter — free, no API key */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap &copy; CARTO'
      />

      {hotspots.map((h) => {
        const color = LEVEL_COLORS[h.level];
        return (
          <Fragment key={h.id}>
            {/* Outer glow */}
            <CircleMarker
              center={[h.lat, h.lng]}
              radius={radiusFor(h.pm25) * 1.9}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.12,
                weight: 0,
              }}
            />
            {/* Core marker */}
            <CircleMarker
              center={[h.lat, h.lng]}
              radius={radiusFor(h.pm25)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.65,
                weight: 1.5,
              }}
            >
              <Popup>
                <div className="min-w-[150px]">
                  <p className="font-semibold">{h.name}</p>
                  <p className="text-sm">
                    PM2.5:{" "}
                    <span style={{ color }} className="font-bold">
                      {h.pm25} µg/m³
                    </span>
                  </p>
                  <p className="text-xs capitalize text-gray-400">{h.level}</p>
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        );
      })}
    </MapContainer>
  );
}
