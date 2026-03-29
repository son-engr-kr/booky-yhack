"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  { href: "/planet", icon: "/assets/icons/planet.png", label: "Home" },
  { href: "/library", icon: "/assets/icons/opened-book.png", label: "Library" },
  { href: "/feed", icon: "/assets/icons/galaxy.png", label: "Feed" },
  { href: "/my-books", icon: "/assets/icons/simple-book.png", label: "Books" },
  { href: "/planet/detail", icon: "/assets/icons/simple-planet.png", label: "Profile" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-100">
      <div className="max-w-md mx-auto flex justify-around py-2">
        {tabs.map((tab) => {
          const isActive =
            pathname === tab.href || pathname?.startsWith(tab.href + "/");
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
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-amber-700" : "text-gray-400"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-2 w-6 h-0.5 bg-amber-600 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
