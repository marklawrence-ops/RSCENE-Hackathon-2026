import { RequireAuth } from "@/components/auth/require-auth";
import { ReportsScreen } from "@/components/reports/reports-screen";

export const metadata = { title: "Reports · AGOS" };

// Staff only: reports carry follow-up lists for the CDRRMO and the planning office.
export default function ReportsPage() {
  return (
    <RequireAuth eyebrow="REPORTS" intro="Sign in to print the quarterly readiness report or a barangay profile." roles={["planner", "cdrrmo"]}>
      <ReportsScreen />
    </RequireAuth>
  );
}
