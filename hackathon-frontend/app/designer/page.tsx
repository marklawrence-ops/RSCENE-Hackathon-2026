import { AppHeader } from "@/components/app-header";
import { DesignerScreen } from "@/components/designer/designer-screen";

export const metadata = { title: "Program Designer · Water Planner" };

export default function DesignerPage() {
  return (
    <div className="flex h-dvh flex-col">
      <AppHeader />
      <DesignerScreen />
    </div>
  );
}
