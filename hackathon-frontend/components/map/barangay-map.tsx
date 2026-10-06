"use client";

import "leaflet/dist/leaflet.css";
import L, { type LatLngBoundsExpression } from "leaflet";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { BarangaySummary, Site } from "@/lib/types";

export type MapView = "town" | "city";

type Props = {
  barangays: BarangaySummary[];
  colorFor: (b: BarangaySummary) => string;
  selectedId: number | null;
  onSelect: (id: number) => void;
  sites: Site[];
  selectedSiteId: number | null;
  onSelectSite: (site: Site) => void;
  suggestedSiteIds: Set<number>;
  defaultBounds: [[number, number], [number, number]] | null;
  view: MapView;
};

// Circle area grows with population: Manguehay (135) ≈ 6 px, Mercedes (12,281) ≈ 24 px.
const radiusFor = (population: number) => 4 + Math.sqrt(population) / 5.5;

function siteIcon(site: Site, selected: boolean, suggested: boolean) {
  const shape = site.kind === "business" ? "business" : site.tank.status === "installed" ? "tank" : "candidate";
  return L.divIcon({
    className: "",
    html: `<span class="site-pin-wrap${selected ? " site-pin-wrap--selected" : ""}${suggested ? " site-pin-wrap--suggested" : ""}"><span class="site-pin site-pin--${shape}"></span></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function ViewController({ bounds, view }: { bounds: LatLngBoundsExpression | null; view: MapView }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, bounds, view]);
  return null;
}

export default function BarangayMap(props: Props) {
  const { barangays, colorFor, selectedId, onSelect, sites, selectedSiteId, onSelectSite, suggestedSiteIds, defaultBounds, view } = props;

  const allBounds = useMemo<LatLngBoundsExpression | null>(() => {
    const pts = barangays.flatMap((b) => (b.location ? [[b.location.lat, b.location.lng] as [number, number]] : []));
    return pts.length ? L.latLngBounds(pts) : null;
  }, [barangays]);

  const bounds = view === "town" && defaultBounds ? defaultBounds : allBounds;

  return (
    <MapContainer
      center={[11.7753, 124.8829]}
      zoom={13}
      className="h-full w-full"
      scrollWheelZoom
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ViewController bounds={bounds} view={view} />

      {barangays.map((b) => {
        if (!b.location) return null;
        const color = colorFor(b);
        const selected = b.id === selectedId;
        return (
          <CircleMarker
            key={`${b.id}-${color}`}
            center={[b.location.lat, b.location.lng]}
            radius={radiusFor(b.population)}
            pathOptions={{
              color: selected ? "#111827" : "#ffffff",
              weight: selected ? 3 : 1.5,
              fillColor: color,
              fillOpacity: selected ? 0.95 : 0.75,
            }}
            eventHandlers={{ click: () => onSelect(b.id) }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              {b.name}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {sites.map((site) => (
        <Marker
          key={`${site.id}-${site.id === selectedSiteId}-${suggestedSiteIds.has(site.id)}`}
          position={[site.location.lat, site.location.lng]}
          icon={siteIcon(site, site.id === selectedSiteId, suggestedSiteIds.has(site.id))}
          eventHandlers={{ click: () => onSelectSite(site) }}
          zIndexOffset={1000}
        >
          <Tooltip direction="top" offset={[0, -8]}>
            {site.name}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
