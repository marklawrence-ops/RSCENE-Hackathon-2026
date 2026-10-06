import { AppHeader } from "@/components/app-header";
import { FormLoader } from "@/components/form/form-loader";

export const metadata = { title: "Barangay Form · Water Planner" };

export default function FormPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <FormLoader />
    </div>
  );
}
