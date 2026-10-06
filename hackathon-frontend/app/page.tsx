import { AppHeader } from "@/components/app-header";
import { MapScreen } from "@/components/map/map-screen";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <MapScreen />
    </div>
  );
}
