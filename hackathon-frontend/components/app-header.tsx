import Image from "next/image";
import Link from "next/link";

// Add a route here when its page lands.
const NAV = [
  { href: "/", label: "Map" },
  { href: "/designer", label: "Designer" },
  { href: "/storage", label: "Storage" },
  { href: "/form", label: "Form" },
];

export function AppHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/10 bg-white px-4 dark:border-white/10 dark:bg-zinc-950">
      <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold">
        <Image src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
        <span className="hidden sm:inline">Water Planner</span>
      </Link>
      <nav className="flex min-w-0 gap-0.5 overflow-x-auto text-sm sm:gap-1">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="shrink-0 rounded-md px-2 py-1.5 hover:bg-zinc-100 sm:px-3 dark:hover:bg-zinc-800">
            {item.label}
          </Link>
        ))}
      </nav>
      <Link href="/status" className="ml-auto hidden shrink-0 text-xs text-zinc-500 hover:underline sm:inline">
        API status
      </Link>
    </header>
  );
}
