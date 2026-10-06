import { AppHeader } from "@/components/app-header";
import { StorageScreen } from "@/components/storage/storage-screen";

export const metadata = { title: "Storage Registry · Water Planner" };

export default function StoragePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <StorageScreen />
    </div>
  );
}
