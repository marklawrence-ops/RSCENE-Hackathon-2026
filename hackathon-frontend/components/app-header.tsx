import Image from "next/image";
import Link from "next/link";

// Add a route here when its page lands.
const NAV = [{ href: "/", label: "Map" }];

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-black/10 bg-white px-4 dark:border-white/10 dark:bg-zinc-950">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
        <span className="hidden sm:inline">Water Planner</span>
      </Link>
      <nav className="flex gap-1 text-sm">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="rounded-md px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            {item.label}
          </Link>
        ))}
      </nav>
      <Link href="/status" className="ml-auto text-xs text-zinc-500 hover:underline">
        API status
      </Link>
    </header>
  );
}
