import { GuideScreen } from "@/components/guide/guide-screen";

export const metadata = {
  title: "Household Guide · AGOS",
  description: "Safe reuse of rinse water and rain at home, in English, Filipino and Waray.",
};

// Public: no sign-in. Barangay health workers can show it on a phone or print it as the guidance card.
export default function GuidePage() {
  return <GuideScreen />;
}
