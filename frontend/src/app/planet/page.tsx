"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
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

type DetailView = null | { type: "me" } | { type: "friend"; id: string };

export default function PlanetPage() {
  const [myPlanet, setMyPlanet] = useState<PlanetData | null>(null);
  const [friendPlanets, setFriendPlanets] = useState<FriendPlanet[]>([]);
  const [detail, setDetail] = useState<DetailView>(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getMyPlanet().then(setMyPlanet);
    getFriendPlanets().then(setFriendPlanets);
  }, []);

  const handlePlanetTap = (type: "me" | "friend", id?: string) => {
    if (type === "me") {
      setDetail({ type: "me" });
    } else if (id) {
      setDetail({ type: "friend", id });
    }
  };

  const selectedFriend = detail?.type === "friend"
    ? friendPlanets.find((f) => f.id === detail.id)
    : null;

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

      {/* My Planet Detail Sheet */}
      <AnimatePresence>
        {detail?.type === "me" && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-16 left-0 right-0 z-20 bg-[#0c0c18]/95 backdrop-blur-xl border-t border-amber-500/10 rounded-t-3xl p-5"
          >
            <button
              onClick={() => setDetail(null)}
              className="absolute top-3 right-4 text-gray-500 text-sm"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/assets/planet2.png"
                className="w-12 h-12 rounded-full object-cover"
                alt="My Planet"
              />
              <div>
                <div className="text-white font-bold text-lg">My Planet</div>
                <div className="text-gray-500 text-xs">
                  Level {myPlanet.level} · {Object.keys(myPlanet.genres)[0]} explorer
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {[
                { n: myPlanet.booksRead, l: "Books" },
                { n: myPlanet.totalNotes, l: "Notes" },
                { n: myPlanet.totalChoices, l: "Choices" },
                { n: "91%", l: "w/ Alex" },
              ].map((s) => (
                <div key={s.l} className="text-center">
                  <div className="text-amber-500 font-bold text-lg">{s.n}</div>
                  <div className="text-gray-500 text-[10px]">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(myPlanet.genres).map(([genre, pct]) => (
                <span
                  key={genre}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400"
                >
                  {genre} {pct}%
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Friend Planet Detail Sheet */}
      <AnimatePresence>
        {detail?.type === "friend" && selectedFriend && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="absolute bottom-16 left-0 right-0 z-20 bg-[#0c0c18]/95 backdrop-blur-xl border-t border-amber-500/10 rounded-t-3xl p-5"
          >
            <button
              onClick={() => setDetail(null)}
              className="absolute top-3 right-4 text-gray-500 text-sm"
            >
              ✕
            </button>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={`/assets/${selectedFriend.planetImage}`}
                className="w-12 h-12 rounded-full object-cover"
                alt={selectedFriend.name}
              />
              <div>
                <div className="text-white font-bold text-lg">
                  {selectedFriend.name}
                </div>
                <div className="text-gray-500 text-xs">
                  {selectedFriend.similarity}% match
                </div>
              </div>
            </div>
            <a
              href={`/constellation/great-gatsby`}
              className="block text-center bg-amber-500/10 border border-amber-500/20 rounded-xl py-2 text-amber-500 text-sm font-semibold mt-3"
            >
              View Constellation →
            </a>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
