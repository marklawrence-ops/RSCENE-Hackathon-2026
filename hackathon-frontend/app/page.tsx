import Image from "next/image";
import { ConnectionStatus } from "./connection-status";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex items-center gap-3">
        <Image src="/icons/icon-192.png" alt="" width={48} height={48} className="rounded-xl" priority />
        <h1 className="text-2xl font-semibold">Circular Water Network Planner</h1>
      </div>
      <p className="text-zinc-600 dark:text-zinc-400">
        Water used once is water wasted. Map where used water and rain can serve a second purpose, safely, and keep
        non-potable needs running when the main supply fails.
      </p>
      <ConnectionStatus />
    </main>
  );
}
