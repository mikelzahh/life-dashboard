"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sections } from "./nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {sections.map((s) => {
        const active = s.href === "/" ? pathname === "/" : pathname.startsWith(s.href);
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-accent/10 font-medium text-accent"
                : "text-muted hover:bg-foreground/5 hover:text-foreground"
            }`}
          >
            <span className="w-4 text-center" aria-hidden>
              {s.icon}
            </span>
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
