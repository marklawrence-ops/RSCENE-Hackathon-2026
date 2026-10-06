import { AppHeader } from "@/components/app-header";
import { GuideScreen } from "@/components/guide/guide-screen";

export const metadata = {
  title: "Household Guide · Water Planner",
  description: "Safe reuse of rinse water and rain at home, in English, Filipino and Waray.",
};

// Public: no sign-in. Barangay health workers can show it on a phone or print it as the guidance card.
export default function GuidePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="print:hidden">
        <AppHeader />
      </div>
      <GuideScreen />
    </div>
  );
}
