"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import { getMyPlanet, getFriendPlanets, type PlanetData, type FriendPlanet } from "@/lib/api";

// Kepler orbit config: T ∝ r^(3/2)
// Three orbit rings with radii (px). Duration in seconds ∝ r^(3/2) / base
const ORBIT_RINGS = [
  { id: 1, size: 160 },  // closest — fastest
  { id: 2, size: 250 },  // medium
  { id: 3, size: 340 },  // farthest — slowest
];

// Base period at r=160 → T_base = 18s
// r=250 → T = 18 * (250/160)^(3/2) ≈ 18 * 2.44 ≈ 44s  (actually (250/160)^1.5 = 1.5625^1.5 ≈ 1.953 → 35s)
// r=340 → T = 18 * (340/160)^1.5 = 18 * 2.125^1.5 ≈ 18 * 3.096 ≈ 56s
function keplerPeriod(r: number): number {
  const base = 18;
  const rBase = 160;
  return base * Math.pow(r / rBase, 1.5);
}

// Assign friend planets to orbits based on similarity
// similarity >= 80 → orbit 1 (close), 60–79 → orbit 2, <60 → orbit 3
function getOrbitForSimilarity(similarity: number): number {
  if (similarity >= 80) return 1;
  if (similarity >= 60) return 2;
  return 3;
}

// Spread friends around their orbit using an angle offset per index within the orbit
function getAngleOffset(indexInOrbit: number, totalInOrbit: number): number {
  if (totalInOrbit === 1) return 45;
  return (360 / totalInOrbit) * indexInOrbit + 45;
}

// Planet image cycling for friends who have an index-based image
const PLANET_IMAGES = [
  "/assets/planet3-3d.jpg",
  "/assets/planet1-3d.jpg",
  "/assets/planet4-3d.jpg",
  "/assets/planet5-3d.jpg",
  "/assets/planet6-3d.jpg",
];

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
  friendPlanets.forEach((fp) => {
    const orbit = getOrbitForSimilarity(fp.similarity);
    orbitGroups[orbit].push(fp);
  });

  // Friends with speech bubbles (first 3 that have latestFeed)
  const speakingFriends = friendPlanets.filter((f) => f.latestFeed).slice(0, 3);

  if (!myPlanet) return null;

  const myPlanetSrc = myPlanet.planetImage?.startsWith("/")
    ? myPlanet.planetImage
    : "/assets/planet2-3d.jpg";

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
          0%, 100% { box-shadow: 0 0 24px rgba(100,180,100,0.35), 0 0 48px rgba(100,180,100,0.15); }
          50%       { box-shadow: 0 0 32px rgba(100,180,100,0.55), 0 0 64px rgba(100,180,100,0.25); }
        }
        @keyframes glow-ring {
          0%, 100% { opacity: 0.12; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.22; transform: translate(-50%, -50%) scale(1.04); }
        }
      `}</style>

      <div className="h-screen w-full relative overflow-hidden bg-[#050507]">

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

        {/* === PORTHOLE FRAME — giant circular window with ship-wall shadow === */}
        <div
          className="absolute porthole-frame pointer-events-none"
          style={{
            width: "165%",
            aspectRatio: "1",
            top: "45%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            zIndex: 8,
          }}
        />

        {/* Bottom bezel gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: 48,
            background: "linear-gradient(0deg, #eceef4 0%, #eceef4 40%, transparent 100%)",
            zIndex: 9,
            borderRadius: "0 0 24px 24px",
          }}
        />

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
              width: ring.size,
              height: ring.size,
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              border: "1px solid rgba(255,255,255,0.05)",
              zIndex: 1,
            }}
          />
        ))}

        {/* === MY PLANET (center) === */}
        {/* Pulsing glow ring */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 96,
            height: 96,
            top: "50%",
            left: "50%",
            border: "1px solid rgba(255,215,0,0.10)",
            animation: "glow-ring 3s ease-in-out infinite",
            zIndex: 2,
          }}
        />
        <button
          onClick={() => handlePlanetTap("me")}
          className="absolute rounded-full overflow-hidden"
          style={{
            width: 72,
            height: 72,
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
            width={72}
            height={72}
            className="rounded-full object-cover w-full h-full"
            style={{ boxShadow: "inset -6px -6px 12px rgba(0,0,0,0.4)" }}
          />
        </button>

        {/* === FRIEND PLANETS on orbits === */}
        {ORBIT_RINGS.map((ring) => {
          const friends = orbitGroups[ring.id];
          const period = keplerPeriod(ring.size / 2);
          return friends.map((fp, idx) => {
            const total = friends.length;
            const startDeg = getAngleOffset(idx, total);
            const planetSize = ring.id === 1 ? 40 : ring.id === 2 ? 34 : 28;
            const imgSrc = fp.planetImage?.startsWith("/")
              ? fp.planetImage
              : PLANET_IMAGES[friendPlanets.indexOf(fp) % PLANET_IMAGES.length];

            return (
              <button
                key={fp.id}
                className="orbit-planet"
                onClick={() => handlePlanetTap("friend", fp.id)}
                style={{
                  width: planetSize,
                  height: planetSize,
                  zIndex: 4,
                  padding: 0,
                  border: "none",
                  background: "none",
                  "--orbit-r": `${ring.size / 2}px`,
                  "--orbit-duration": `${period}s`,
                  "--start-angle": `${startDeg}deg`,
                  animationDelay: `${-(period * startDeg) / 360}s`,
                } as React.CSSProperties}
                title={`${fp.name} · ${fp.similarity}%`}
              >
                <Image
                  src={imgSrc}
                  alt={fp.name}
                  width={planetSize}
                  height={planetSize}
                  className="rounded-full object-cover w-full h-full"
                  style={{
                    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
                    filter: `drop-shadow(0 0 6px rgba(150,150,200,0.3))`,
                  }}
                />
              </button>
            );
          });
        })}

        {/* === SPEECH BUBBLES (ambient float) === */}
        {speakingFriends.map((fp, i) => {
          // Scatter bubbles around the scene
          const positions = [
            { top: "14%", right: "18%", left: undefined },
            { top: undefined, bottom: "30%", left: "12%", right: undefined },
            { top: "22%", left: "14%", right: undefined, bottom: undefined },
          ];
          const pos = positions[i] ?? positions[0];
          const delays = [0, 1.8, 3.2];
          const durations = [5, 6, 5.5];

          return (
            <motion.div
              key={fp.id}
              className="absolute z-[5] cursor-pointer"
              style={{
                top: pos.top,
                bottom: (pos as { bottom?: string }).bottom,
                left: pos.left,
                right: pos.right,
                maxWidth: 110,
                background: "rgba(22,22,40,0.88)",
                border: "1px solid rgba(255,215,0,0.2)",
                borderRadius: "8px 8px 8px 2px",
                padding: "5px 8px",
                backdropFilter: "blur(4px)",
              }}
              initial={{ opacity: 0, y: 4, scale: 0.92 }}
              animate={{
                opacity: [0, 0.9, 0.9, 0],
                y: [4, 0, 0, -3],
                scale: [0.92, 1, 1, 0.95],
              }}
              transition={{
                duration: durations[i],
                delay: delays[i],
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.15, 0.7, 1],
              }}
              onClick={() => handlePlanetTap("friend", fp.id)}
            >
              {/* Tail */}
              <div
                className="absolute"
                style={{
                  bottom: -4,
                  left: 4,
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid rgba(22,22,40,0.88)",
                  borderBottom: "4px solid transparent",
                }}
              />
              <div className="text-[#FFD700] font-semibold leading-none mb-[2px]" style={{ fontSize: 9 }}>
                {fp.name}
              </div>
              <div className="text-[#ccc] leading-snug" style={{ fontSize: 9 }}>
                {fp.latestFeed}
              </div>
            </motion.div>
          );
        })}

        {/* === BOTTOM NAV === */}
        <BottomNav />
      </div>
    </>
  );
}
