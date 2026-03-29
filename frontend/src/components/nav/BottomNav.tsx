"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";

const tabs = [
  { href: "/planet", icon: "🪐", label: "Home" },
  { href: "/library", icon: "📚", label: "Library" },
  { href: "/feed", icon: "💬", label: "Feed" },
  { href: "/my-books", icon: "📖", label: "Books" },
  { href: "/planet/detail", icon: "👤", label: "Profile" },
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
              <span className="text-lg">{tab.icon}</span>
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
