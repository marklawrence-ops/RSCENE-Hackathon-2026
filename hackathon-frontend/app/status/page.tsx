import { AppHeader } from "@/components/app-header";
import { ConnectionStatus } from "../connection-status";

export default function StatusPage() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 px-4 py-10">
        <h1 className="text-xl font-semibold">API status</h1>
        <ConnectionStatus />
      </main>
    </>
  );
}
