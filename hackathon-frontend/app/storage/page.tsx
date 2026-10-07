import { RequireAuth } from "@/components/auth/require-auth";
import { StorageScreen } from "@/components/storage/storage-screen";

export const metadata = { title: "Storage Registry · AGOS" };

export default function StoragePage() {
  return (
    <RequireAuth eyebrow="STORAGE REGISTRY" intro="Sign in to see stored rainwater per barangay and export the quarterly summary.">
      <StorageScreen />
    </RequireAuth>
  );
}
