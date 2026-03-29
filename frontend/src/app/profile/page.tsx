"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import { getReadingProfile, getFriends, type ReadingProfile, type Friend } from "@/lib/api";

const RADAR_AXES = ["Empathy", "Logic", "Adventure", "Caution", "Optimism"] as const;
const RADAR_COUNT = RADAR_AXES.length;

function radarPoints(values: number[], cx: number, cy: number, r: number): string {
  return values
    .map((v, i) => {
      const angle = (Math.PI * 2 * i) / RADAR_COUNT - Math.PI / 2;
      const dist = (v / 100) * r;
      return `${cx + dist * Math.cos(angle)},${cy + dist * Math.sin(angle)}`;
    })
    .join(" ");
}

function axisEndpoints(cx: number, cy: number, r: number) {
  return Array.from({ length: RADAR_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / RADAR_COUNT - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ReadingProfile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    getReadingProfile().then(setProfile);
    getFriends().then(setFriends);
  }, []);

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#f0f2f8] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Loading your profile...</div>
      </div>
    );
  }

  const cx = 100;
  const cy = 100;
  const r = 70;
  const radarValues = RADAR_AXES.map((ax) => profile.radar[ax] ?? 0);
  const endpoints = axisEndpoints(cx, cy, r);

  return (
    <div className="min-h-screen bg-[#f0f2f8] pb-24">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 text-center">
        <div className="relative w-20 h-20 mx-auto mb-3">
          <img
            src="/assets/planet2.png"
            alt="Your planet"
            className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
          />
          <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full w-6 h-6 flex items-center justify-center text-[10px] text-white font-bold shadow">
            ✦
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900">My Reading Profile</h1>
        <p className="text-xs text-gray-400 mt-0.5">Based on your choices across all books</p>
      </div>

      <div className="px-4 flex flex-col gap-5">
        {/* Spectrum sliders */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Reading Spectrum</h2>
          <div className="flex flex-col gap-4">
            {profile.spectrum.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                  <span>{item.left}</span>
                  <span className="font-medium text-gray-600">{item.label}</span>
                  <span>{item.right}</span>
                </div>
                <div className="relative h-2 bg-gray-100 rounded-full">
                  <motion.div
                    initial={{ left: "50%" }}
                    animate={{ left: `${item.value}%` }}
                    transition={{ duration: 0.8, type: "spring", stiffness: 200 }}
                    className="absolute -top-0.5 -translate-x-1/2 w-3 h-3 bg-amber-500 rounded-full shadow border-2 border-white"
                    style={{ left: `${item.value}%` }}
                  />
                  <div
                    className="absolute h-full bg-amber-200 rounded-full"
                    style={{
                      left: item.value < 50 ? `${item.value}%` : "50%",
                      width: `${Math.abs(item.value - 50)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar chart */}
        <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
          <h2 className="text-sm font-bold text-gray-800 mb-3">Reader Archetype</h2>
          <div className="flex justify-center">
            <svg viewBox="0 0 200 200" className="w-48 h-48">
              {/* Concentric grid rings */}
              {[0.25, 0.5, 0.75, 1].map((scale) => (
                <polygon
                  key={scale}
                  points={radarPoints(
                    Array(RADAR_COUNT).fill(scale * 100),
                    cx,
                    cy,
                    r
                  )}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth={0.8}
                />
              ))}

              {/* Axis lines */}
              {endpoints.map((ep, i) => (
                <line
                  key={i}
                  x1={cx}
                  y1={cy}
                  x2={ep.x}
                  y2={ep.y}
                  stroke="#e5e7eb"
                  strokeWidth={0.8}
                />
              ))}

              {/* Filled area */}
              <motion.polygon
                initial={{ points: radarPoints(Array(RADAR_COUNT).fill(0), cx, cy, r) }}
                animate={{ points: radarPoints(radarValues, cx, cy, r) }}
                transition={{ duration: 1, delay: 0.3 }}
                fill="rgba(217,119,6,0.15)"
                stroke="#d97706"
                strokeWidth={1.5}
                strokeLinejoin="round"
              />

              {/* Axis labels */}
              {endpoints.map((ep, i) => {
                const labelX = cx + (r + 14) * Math.cos((Math.PI * 2 * i) / RADAR_COUNT - Math.PI / 2);
                const labelY = cy + (r + 14) * Math.sin((Math.PI * 2 * i) / RADAR_COUNT - Math.PI / 2);
                return (
                  <text
                    key={i}
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={7}
                    fill="#6b7280"
                    fontWeight="600"
                  >
                    {RADAR_AXES[i]}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Insights */}
        {profile.tendencies.length > 0 && (
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Your Tendencies</h2>
            <div className="flex flex-col gap-3">
              {profile.tendencies.map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-sm flex-shrink-0">
                    {i === 0 ? "💛" : i === 1 ? "🔍" : "🌟"}
                  </div>
                  <div>
                    <p className="text-xs text-gray-700 leading-relaxed">{t.text}</p>
                    <div className="mt-1 h-1 bg-gray-100 rounded-full w-32 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${t.percentage}%` }}
                        transition={{ duration: 0.8, delay: i * 0.15 }}
                        className="h-full bg-amber-400 rounded-full"
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{t.percentage}% of the time</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Friend comparison */}
        {profile.friendComparison.length > 0 && (
          <div className="bg-white/85 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white">
            <h2 className="text-sm font-bold text-gray-800 mb-3">Friend Match</h2>
            <div className="flex flex-col gap-3">
              {profile.friendComparison.map((fc) => {
                const friend = friends.find((f) => f.id === fc.friendId);
                const matchColor =
                  fc.matchPercentage >= 80
                    ? "bg-amber-400"
                    : fc.matchPercentage >= 60
                    ? "bg-indigo-400"
                    : "bg-gray-300";
                return (
                  <div key={fc.friendId} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                      {friend?.planetImage ? (
                        <img
                          src={`/assets/${friend.planetImage}`}
                          alt={fc.friendName}
                          className="w-9 h-9 rounded-full object-cover"
                        />
                      ) : (
                        fc.friendName.charAt(0)
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-800">{fc.friendName}</div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 bg-gray-100 rounded-full flex-1 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${fc.matchPercentage}%` }}
                            transition={{ duration: 0.8 }}
                            className={`h-full rounded-full ${matchColor}`}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-gray-700 w-8 text-right">
                          {fc.matchPercentage}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
