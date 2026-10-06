import { RequireAuth } from "@/components/auth/require-auth";
import { DesignerScreen } from "@/components/designer/designer-screen";

export const metadata = { title: "Program Designer · AGOS" };

export default function DesignerPage() {
  return (
    <RequireAuth eyebrow="PROGRAM DESIGNER" intro="Sign in to price a program and see the days of cover it buys.">
      <DesignerScreen />
    </RequireAuth>
  );
}
