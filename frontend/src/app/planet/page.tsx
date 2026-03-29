"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import { getMyPlanet, getFriendPlanets, type PlanetData, type FriendPlanet } from "@/lib/api";

// Kepler orbit config: T ∝ r^(3/2)
// Three orbit rings with sizes in vmin units
const ORBIT_RINGS = [
  { id: 1, size: 65 },   // closest — fastest
  { id: 2, size: 100 },  // medium
  { id: 3, size: 135 },  // farthest — slowest
];

// Base period at r=160 → T_base = 18s
// r=250 → T = 18 * (250/160)^(3/2) ≈ 18 * 2.44 ≈ 44s  (actually (250/160)^1.5 = 1.5625^1.5 ≈ 1.953 → 35s)
// r=340 → T = 18 * (340/160)^1.5 = 18 * 2.125^1.5 ≈ 18 * 3.096 ≈ 56s
function keplerPeriod(r: number): number {
  const base = 360; // very slow: 360s base period
  const rBase = 160;
  return base * Math.pow(r / rBase, 1.5);
}

// Assign each friend to a unique orbit ring (round-robin across rings)
function getOrbitForIndex(index: number): number {
  return (index % ORBIT_RINGS.length) + 1;
}

// Spread friends around orbit — different start angles per orbit ring for variety
function getAngleOffset(indexInOrbit: number, totalInOrbit: number, ringId: number): number {
  const ringOffset = ringId * 120; // each ring starts at a different angle
  if (totalInOrbit === 1) return ringOffset + 30;
  return (360 / totalInOrbit) * indexInOrbit + ringOffset;
}

// Convert API planetImage ("planet2.png") → asset path
function toPlanetSrc(planetImage?: string): string {
  if (!planetImage) return "/assets/planet2.png";
  if (planetImage.startsWith("/")) return planetImage;
  return `/assets/${planetImage}`;
}

// 30 static twinkling stars with varied positions and timings
const STARS = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  top: `${5 + (i * 37 + i * i * 3) % 88}%`,
  left: `${3 + (i * 53 + i * 7) % 92}%`,
  size: i % 5 === 0 ? 1.5 : i % 3 === 0 ? 1.2 : 1,
  duration: `${3.5 + (i % 7) * 0.6}s`,
  delay: `${(i * 0.4) % 5}s`,
  color: i % 4 === 0 ? "rgba(255,220,150,0.8)" : i % 4 === 1 ? "rgba(200,220,255,0.8)" : "rgba(255,255,255,0.85)",
}));

export default function PlanetPage() {
  const router = useRouter();
  const [myPlanet, setMyPlanet] = useState<PlanetData | null>(null);
  const [friendPlanets, setFriendPlanets] = useState<FriendPlanet[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    getMyPlanet().then(setMyPlanet);
    getFriendPlanets().then(setFriendPlanets);
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handlePlanetTap = (type: "me" | "friend", id?: string) => {
    if (type === "me") {
      router.push("/planet/detail");
    } else if (id) {
      router.push(`/planet/friend/${id}`);
    }
  };

  const filters = ["All", "Close friends", "Gatsby readers"];

  // Group friends by orbit ring
  const orbitGroups: Record<number, FriendPlanet[]> = { 1: [], 2: [], 3: [] };
  friendPlanets.forEach((fp, idx) => {
    const orbit = getOrbitForIndex(idx);
    orbitGroups[orbit].push(fp);
  });

  // Friends with speech bubbles — show one at a time, cycling
  const speakingFriends = friendPlanets.filter((f) => f.latestFeed).slice(0, 4);
  const [activeBubble, setActiveBubble] = useState(0);
  useEffect(() => {
    if (speakingFriends.length === 0) return;
    const interval = setInterval(() => {
      setActiveBubble((prev) => (prev + 1) % speakingFriends.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [speakingFriends.length]);

  if (!myPlanet) return null;

  const myPlanetSrc = toPlanetSrc(myPlanet.planetImage);

  return (
    <>
      <style>{`
        @keyframes orbit-spin {
          from { transform: translate(-50%, -50%) rotate(var(--start-angle)) translateX(var(--orbit-r)) rotate(calc(-1 * var(--start-angle))); }
          to   { transform: translate(-50%, -50%) rotate(calc(var(--start-angle) + 360deg)) translateX(var(--orbit-r)) rotate(calc(-1 * (var(--start-angle) + 360deg))); }
        }
        .orbit-planet {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 50%;
          cursor: pointer;
          animation: orbit-spin var(--orbit-duration) linear infinite;
          transform-origin: 0 0;
        }
        .orbit-planet:hover { filter: brightness(1.25) drop-shadow(0 0 8px rgba(255,215,0,0.5)); }
        @keyframes planet-pulse {
          0%, 100% { filter: drop-shadow(0 0 40px rgba(100,180,100,0.2)) drop-shadow(0 0 80px rgba(100,180,100,0.1)); }
          50%       { filter: drop-shadow(0 0 60px rgba(100,180,100,0.3)) drop-shadow(0 0 100px rgba(100,180,100,0.15)); }
        }
        @keyframes glow-ring {
          0%, 100% { opacity: 0.12; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.22; transform: translate(-50%, -50%) scale(1.04); }
        }
      `}</style>

      <div className="h-screen w-full relative overflow-hidden bg-[#050507]" style={{ maxHeight: "100dvh" }}>

        {/* === MILKY WAY — subtle diagonal gradient band === */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              "radial-gradient(80px 200px at 82% 12%, rgba(160,160,200,0.09) 0%, transparent 100%)",
              "radial-gradient(90px 220px at 68% 28%, rgba(140,90,170,0.07) 0%, transparent 100%)",
              "radial-gradient(100px 240px at 52% 45%, rgba(130,80,150,0.06) 0%, transparent 100%)",
              "radial-gradient(80px 200px at 35% 62%, rgba(110,70,140,0.05) 0%, transparent 100%)",
              "radial-gradient(70px 180px at 18% 80%, rgba(90,60,120,0.04) 0%, transparent 100%)",
              "radial-gradient(40px 18px at 62% 38%, rgba(200,160,80,0.12), transparent)",
              "radial-gradient(120px 40px at 70% 25%, rgba(180,170,200,0.05), transparent)",
            ].join(", "),
          }}
        />

        {/* === MILKY WAY glow blobs === */}
        {[
          { w: 50, h: 80, top: "5%", right: "5%", left: undefined },
          { w: 55, h: 90, top: "20%", right: "20%", left: undefined },
          { w: 60, h: 85, top: "38%", right: undefined, left: "35%" },
          { w: 50, h: 75, top: "55%", right: undefined, left: "22%" },
          { w: 45, h: 70, top: "72%", right: undefined, left: "10%" },
        ].map((g, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              width: g.w,
              height: g.h,
              top: g.top,
              right: g.right,
              left: g.left,
              background: "rgba(160,160,200,0.1)",
              borderRadius: "50%",
              filter: "blur(14px)",
              transform: "rotate(-40deg)",
            }}
          />
        ))}

        {/* === TWINKLING STARS === */}
        {STARS.map((s) => (
          <div
            key={s.id}
            className="absolute rounded-full pointer-events-none star-twinkle"
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              background: s.color,
              "--duration": s.duration,
              "--delay": s.delay,
            } as React.CSSProperties}
          />
        ))}

        {/* === SHOOTING STARS === */}
        <div
          className="absolute pointer-events-none shooting-star"
          style={{ top: "15%", left: "80%", "--duration": "6s", "--delay": "1s" } as React.CSSProperties}
        >
          <div
            className="absolute"
            style={{
              top: 0, right: 0, width: 40, height: 1,
              background: "linear-gradient(90deg, rgba(255,255,255,0.6), transparent)",
            }}
          />
        </div>
        <div
          className="absolute pointer-events-none shooting-star"
          style={{ top: "40%", left: "90%", "--duration": "8s", "--delay": "3.5s" } as React.CSSProperties}
        >
          <div
            className="absolute"
            style={{
              top: 0, right: 0, width: 32, height: 1,
              background: "linear-gradient(90deg, rgba(255,255,255,0.5), transparent)",
            }}
          />
        </div>


        {/* === FILTER PILLS === */}
        <div className="absolute top-0 left-0 right-0 z-10 pt-8 px-4">
          <div className="flex gap-2">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f.toLowerCase())}
                className={`text-[10px] px-3 py-1 rounded-full border transition-all ${
                  filter === f.toLowerCase()
                    ? "border-[#FFD700] text-[#FFD700] bg-[rgba(255,215,0,0.08)]"
                    : "border-[#2a2a3e] text-[#666]"
                }`}
                style={{ zIndex: 10 }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* === ORBIT RINGS === */}
        {ORBIT_RINGS.map((ring) => (
          <div
            key={ring.id}
            className="absolute rounded-full pointer-events-none"
            style={{
              width: `${ring.size}vmin`,
              height: `${ring.size}vmin`,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              border: "1px solid rgba(255,255,255,0.05)",
              zIndex: 1,
            }}
          />
        ))}

        {/* === MY PLANET (center) === */}
        <button
          onClick={() => handlePlanetTap("me")}
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: "33vmin",
            height: "33vmin",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            animation: "planet-pulse 4s ease-in-out infinite",
            zIndex: 3,
            padding: 0,
            border: "none",
            background: "none",
          }}
        >
          <Image
            src={myPlanetSrc}
            alt="My planet"
            width={200}
            height={200}
            className="rounded-full object-cover w-full h-full"
            style={{ filter: "drop-shadow(0 0 16px rgba(100,180,100,0.4))" }}
          />
        </button>

        {/* === FRIEND PLANETS on orbits === */}
        {ORBIT_RINGS.map((ring) => {
          const friends = orbitGroups[ring.id];
          const period = keplerPeriod(ring.size / 2);
          return friends.map((fp, idx) => {
            const total = friends.length;
            const startDeg = getAngleOffset(idx, total, ring.id);
            const planetVmin = ring.id === 1 ? 19 : ring.id === 2 ? 19 : 15;
            const imgSrc = toPlanetSrc(fp.planetImage);

            return (
              <button
                key={fp.id}
                className="orbit-planet"
                onClick={() => handlePlanetTap("friend", fp.id)}
                style={{
                  width: `${planetVmin}vmin`,
                  height: `${planetVmin}vmin`,
                  zIndex: 4,
                  padding: 0,
                  border: "none",
                  background: "none",
                  "--orbit-r": `${ring.size / 2}vmin`,
                  "--orbit-duration": `${period}s`,
                  "--start-angle": `${startDeg}deg`,
                  animationDelay: `${-(period * startDeg) / 360}s`,
                } as React.CSSProperties}
                title={`${fp.name} · ${fp.similarity}%`}
              >
                <Image
                  src={imgSrc}
                  alt={fp.name}
                  width={112}
                  height={112}
                  className="rounded-full object-cover w-full h-full"
                  style={{
                    filter: `drop-shadow(0 0 8px rgba(150,150,200,0.3))`,
                  }}
                />
                {/* Name label */}
                <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[12px] text-gray-400 whitespace-nowrap font-medium">
                  {fp.name}
                </span>
                {/* Speech bubble — only shown when this friend is active */}
                {fp.latestFeed && speakingFriends[activeBubble]?.id === fp.id && (
                  <div
                    className="absolute bg-black/80 backdrop-blur-md border border-amber-500/20 rounded-lg px-3 py-2 pointer-events-none animate-[fadeInOut_4s_ease-in-out]"
                    style={{ bottom: `calc(${planetVmin}vmin + 12px)`, right: -10, maxWidth: "45vmin", minWidth: "25vmin" }}
                  >
                    <div className="text-[13px] text-amber-400 font-semibold">{fp.name}</div>
                    <div className="text-[12px] text-gray-300 leading-snug">
                      {fp.latestFeed.length > 30 ? fp.latestFeed.slice(0, 30) + "..." : fp.latestFeed}
                    </div>
                    <div className="absolute -bottom-1 right-4 w-2.5 h-2.5 bg-black/80 border-r border-b border-amber-500/20 rotate-45" />
                  </div>
                )}
              </button>
            );
          });
        })}

        {/* Speech bubbles now attached to orbiting planets above */}

        {/* === BOTTOM NAV === */}
        <BottomNav />
      </div>
    </>
  );
}
