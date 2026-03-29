"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import BottomNav from "@/components/nav/BottomNav";
import { getMyPlanet, getFriendPlanets, type PlanetData, type FriendPlanet } from "@/lib/api";

const PlanetScene = dynamic(() => import("@/components/planet/PlanetScene"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#050507]">
      <div className="text-amber-500/50 text-sm animate-pulse">Loading universe...</div>
    </div>
  ),
});

export default function PlanetPage() {
  const router = useRouter();
  const [myPlanet, setMyPlanet] = useState<PlanetData | null>(null);
  const [friendPlanets, setFriendPlanets] = useState<FriendPlanet[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getMyPlanet().then(setMyPlanet);
    getFriendPlanets().then(setFriendPlanets);
  }, []);

  const handlePlanetTap = (type: "me" | "friend", id?: string) => {
    if (type === "me") {
      router.push("/planet/detail");
    } else if (id) {
      router.push(`/planet/friend/${id}`);
    }
  };

  const filters = ["All", "Close friends", "Gatsby readers"];

  if (!myPlanet) return null;

  return (
    <div className="h-screen w-full relative overflow-hidden bg-[#050507]">
      {/* 3D Scene */}
      <PlanetScene
        myPlanet={myPlanet}
        friendPlanets={friendPlanets}
        onPlanetTap={handlePlanetTap}
      />

      {/* Top UI overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f.toLowerCase())}
              className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
                filter === f.toLowerCase()
                  ? "border-amber-600 text-amber-600 bg-amber-600/10"
                  : "border-gray-600 text-gray-500"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
