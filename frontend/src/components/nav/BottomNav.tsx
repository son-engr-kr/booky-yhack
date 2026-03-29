"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/planet", icon: "/assets/icons/planet.png", label: "Home" },
  { href: "/library", icon: "/assets/icons/opened-book.png", label: "Library" },
  { href: "/feed", icon: "/assets/icons/galaxy.png", label: "Feed" },
  { href: "/my-books", icon: "/assets/icons/simple-book.png", label: "Books" },
  { href: "/planet/detail", icon: "/assets/icons/simple-planet.png", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();
  // Match most specific path first — Profile (/planet/detail) before Home (/planet)
  const activeIndex = (() => {
    // Check exact matches and specific prefixes, longer paths first
    const sorted = tabs
      .map((tab, i) => ({ ...tab, i }))
      .sort((a, b) => b.href.length - a.href.length);
    const match = sorted.find(
      (tab) => pathname === tab.href || pathname?.startsWith(tab.href + "/")
    );
    return match?.i ?? -1;
  })();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0b14]/95 backdrop-blur-lg border-t border-white/10">
      <div className="max-w-md mx-auto flex justify-around py-2 relative">
        {tabs.map((tab, i) => {
          const isActive = i === activeIndex;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-0.5 relative"
            >
              <Image
                src={tab.icon}
                alt={tab.label}
                width={22}
                height={22}
                className={`transition-opacity ${isActive ? "opacity-100" : "opacity-50"}`}
                style={{ filter: "brightness(0) invert(1)" }}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-amber-400" : "text-gray-500"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
