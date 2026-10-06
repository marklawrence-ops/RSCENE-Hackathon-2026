import { Suspense } from "react";
import { MapScreen } from "@/components/map/map-screen";

export const metadata = { title: "Reuse Map · AGOS" };

export default function MapPage() {
  // Suspense: the map reads ?outage=1 from the URL.
  return (
    <Suspense fallback={<div className="grid flex-1 place-items-center text-sm text-muted">Loading map…</div>}>
      <MapScreen />
    </Suspense>
  );
}
