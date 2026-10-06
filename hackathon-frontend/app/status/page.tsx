import { ConnectionStatus } from "../connection-status";

export const metadata = { title: "API status · AGOS" };

export default function StatusPage() {
  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <h1 className="text-xl font-extrabold">API status</h1>
      <div className="mt-4">
        <ConnectionStatus />
      </div>
    </div>
  );
}
