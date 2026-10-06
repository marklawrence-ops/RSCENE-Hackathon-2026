"use client";

import "leaflet/dist/leaflet.css";
import L, { type LatLngBounds, type LatLngExpression } from "leaflet";
import { useEffect, useMemo, useRef, useState } from "react";
import { CircleMarker, MapContainer, Marker, Polygon, TileLayer, Tooltip, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import type { BarangaySummary, BoundaryFeature, Site } from "@/lib/types";

export type MapView = "town" | "city";

type Props = {
  barangays: BarangaySummary[];
  boundaries: BoundaryFeature[];
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

// GeoJSON is [lng, lat]; Leaflet wants [lat, lng]. Outer ring plus holes, per polygon.
function toLatLngs(geometry: BoundaryFeature["geometry"]): LatLngExpression[][][] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.map((rings) => rings.map((ring) => ring.map(([lng, lat]) => [lat, lng] as [number, number])));
}

function siteIcon(site: Site, selected: boolean, suggested: boolean) {
  const shape = site.kind === "business" ? "business" : site.tank.status === "installed" ? "tank" : "candidate";
  return L.divIcon({
    className: "",
    html: `<span class="site-pin-wrap${selected ? " site-pin-wrap--selected" : ""}${suggested ? " site-pin-wrap--suggested" : ""}"><span class="site-pin site-pin--${shape}"></span></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

/** Fits the first view instantly, then glides between Town area and Whole city. */
function ViewController({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();
  const first = useRef(true);
  useEffect(() => {
    if (!bounds) return;
    if (first.current) {
      map.fitBounds(bounds, { padding: [16, 16] });
      first.current = false;
    } else {
      map.flyToBounds(bounds, { padding: [16, 16], duration: 0.7 });
    }
  }, [map, bounds]);
  return null;
}

/** Glides to a newly selected barangay only if part of it is off screen. */
function FollowSelection({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && !map.getBounds().contains(bounds)) {
      map.flyToBounds(bounds, { padding: [48, 48], maxZoom: Math.max(map.getZoom(), 14), duration: 0.6 });
    }
  }, [map, bounds]);
  return null;
}

/** Reports the zoom level so pins can thin out when zoomed out. */
function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => onZoom(map.getZoom()), [map, onZoom]);
  return null;
}

// Below this zoom only tanks, suggestions and the selected barangay's sites show.
const DETAIL_ZOOM = 15;

export default function BarangayMap(props: Props) {
  const { barangays, boundaries, colorFor, selectedId, onSelect, sites, selectedSiteId, onSelectSite, suggestedSiteIds, defaultBounds, view } = props;

  const [zoom, setZoom] = useState(13);
  const visibleSites = useMemo(
    () =>
      sites.filter(
        (s) =>
          zoom >= DETAIL_ZOOM ||
          s.tank.status === "installed" ||
          s.barangay_id === selectedId ||
          s.id === selectedSiteId ||
          suggestedSiteIds.has(s.id),
      ),
    [sites, zoom, selectedId, selectedSiteId, suggestedSiteIds],
  );

  const shapes = useMemo(() => {
    const byId = new Map<number, LatLngExpression[][][]>();
    for (const f of boundaries) {
      if (f.properties.barangay_id != null) byId.set(f.properties.barangay_id, toLatLngs(f.geometry));
    }
    return byId;
  }, [boundaries]);

  const allBounds = useMemo(() => {
    const pts: [number, number][] = [];
    for (const b of barangays) {
      const shape = shapes.get(b.id);
      if (shape) shape.forEach((poly) => poly[0].forEach((p) => pts.push(p as [number, number])));
      else if (b.location) pts.push([b.location.lat, b.location.lng]);
    }
    return pts.length ? L.latLngBounds(pts) : null;
  }, [barangays, shapes]);

  const viewBounds = useMemo(
    () => (view === "town" && defaultBounds ? L.latLngBounds(defaultBounds) : allBounds),
    [view, defaultBounds, allBounds],
  );

  const selectedBounds = useMemo(() => {
    const shape = selectedId != null ? shapes.get(selectedId) : undefined;
    return shape ? L.latLngBounds(shape.flatMap((poly) => poly[0] as [number, number][])) : null;
  }, [selectedId, shapes]);


  return (
    <MapContainer center={[11.7753, 124.8829]} zoom={13} zoomControl={false} className="h-full w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · PSA/NAMRIA'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      <ZoomControl position="bottomright" />
      <ZoomWatcher onZoom={setZoom} />
      <ViewController bounds={viewBounds} />
      <FollowSelection bounds={selectedBounds} />

      {barangays.map((b) => {
        const color = colorFor(b);
        const selected = b.id === selectedId;
        const style = {
          color: "#ffffff",
          weight: 1,
          fillColor: color,
          fillOpacity: selected ? 0.85 : 0.6,
        };
        const shape = shapes.get(b.id);
        const handlers = { click: () => onSelect(b.id) };
        const tooltip = (
          <Tooltip sticky direction="top" offset={[0, -6]}>
            {b.name}
          </Tooltip>
        );

        // Polygon when we have the official boundary; circle as a fallback (e.g. mock data).
        return shape ? (
          <Polygon key={b.id} positions={shape} pathOptions={style} smoothFactor={0.5} className="barangay-shape" eventHandlers={handlers}>
            {tooltip}
          </Polygon>
        ) : b.location ? (
          <CircleMarker key={b.id} center={[b.location.lat, b.location.lng]} radius={4 + Math.sqrt(b.population) / 5.5} pathOptions={style} className="barangay-shape" eventHandlers={handlers}>
            {tooltip}
          </CircleMarker>
        ) : null;
      })}

      {/* Selected outline drawn after every shape so neighbours' borders never cover it. */}
      {selectedId != null && shapes.get(selectedId) && (
        <Polygon
          key={`outline-${selectedId}`}
          positions={shapes.get(selectedId)!}
          pathOptions={{ color: "#0f172a", weight: 3, fill: false, interactive: false }}
        />
      )}

      {visibleSites.map((site) => (
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
