"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/nav/BottomNav";
import StarMap from "@/components/constellation/StarMap";
import { getConstellation, getMe, type ConstellationData, type User } from "@/lib/api";

interface StarPopup {
  userId: string;
  userName: string;
  similarity: number;
  topHighlight?: string;
  choice?: string;
  isMe?: boolean;
}

export default function ConstellationPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const router = useRouter();
  const [data, setData] = useState<ConstellationData | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [popup, setPopup] = useState<StarPopup | null>(null);

  useEffect(() => {
    if (!bookId) return;
    getConstellation(bookId).then(setData);
    getMe().then(setMe);
  }, [bookId]);

  // Twinkling background stars (generated once)
  const bgStars = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    delay: Math.random() * 4,
    duration: 2 + Math.random() * 3,
  }));

  if (!data) {
    return (
      <div className="h-screen w-full bg-[#050507] flex items-center justify-center">
        <div className="text-amber-500/50 text-sm animate-pulse">Mapping the constellation...</div>
      </div>
    );
  }

  const readersWithMe = data.readers.map((r) => ({
    ...r,
    isMe: me ? r.userId === me.id : false,
  }));

  const handleStarTap = (reader: { userId: string; userName: string; similarity: number; topHighlight?: string; choice?: string; isMe?: boolean; position: { x: number; y: number } }) => {
    setPopup({
      userId: reader.userId,
      userName: reader.userName,
      similarity: reader.similarity,
      topHighlight: reader.topHighlight,
      choice: reader.choice,
      isMe: reader.isMe ?? false,
    });
  };

  const similarityLabel = (s: number) => {
    if (s >= 85) return "Very similar";
    if (s >= 70) return "Similar";
    if (s >= 55) return "Somewhat similar";
    return "Different path";
  };

  const similarityColor = (s: number) => {
    if (s >= 85) return "text-amber-400";
    if (s >= 70) return "text-indigo-400";
    if (s >= 55) return "text-emerald-400";
    return "text-gray-400";
  };

  return (
    <div className="h-screen w-full bg-[#050507] relative overflow-hidden">
      {/* Twinkling background stars */}
      {bgStars.map((star) => (
        <motion.div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
          }}
          animate={{ opacity: [0.1, 0.7, 0.1] }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
          }}
        />
      ))}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-10 pb-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white/70 text-sm hover:bg-white/20 transition-colors"
        >
          ←
        </button>
        <div>
          <h1 className="text-sm font-bold text-white/90">Reader Constellation</h1>
          <p className="text-[10px] text-gray-500 mt-0.5">{data.readers.length} readers mapped</p>
        </div>
      </div>

      {/* Star map */}
      <div className="absolute inset-0 pt-20 pb-20 px-2 flex items-center justify-center">
        <StarMap
          readers={readersWithMe}
          connections={data.connections}
          onStarTap={handleStarTap}
        />
      </div>

      {/* Legend */}
      <div className="absolute top-20 right-4 z-10 flex flex-col gap-1">
        {[
          { color: "bg-amber-400", label: "Very similar" },
          { color: "bg-indigo-400", label: "Similar" },
          { color: "bg-emerald-400", label: "Somewhat" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${l.color}`} />
            <span className="text-[9px] text-gray-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Star popup */}
      <AnimatePresence>
        {popup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20"
              onClick={() => setPopup(null)}
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="absolute bottom-16 left-4 right-4 z-30 bg-[#0c0c18]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
            >
              <button
                onClick={() => setPopup(null)}
                className="absolute top-3 right-3 text-gray-500 text-sm"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold border-2 ${
                  popup.isMe
                    ? "bg-amber-500/20 border-amber-500 text-amber-400"
                    : "bg-indigo-500/20 border-indigo-400 text-indigo-300"
                }`}>
                  {popup.userName.charAt(0)}
                </div>
                <div>
                  <div className="text-white font-bold text-sm">
                    {popup.isMe ? "You" : popup.userName}
                  </div>
                  {!popup.isMe && (
                    <div className={`text-xs font-medium ${similarityColor(popup.similarity)}`}>
                      {popup.similarity}% · {similarityLabel(popup.similarity)}
                    </div>
                  )}
                </div>
              </div>

              {popup.topHighlight && (
                <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/5">
                  <div className="text-[10px] text-gray-500 mb-1 uppercase tracking-wide">Top highlight</div>
                  <p className="text-xs text-gray-300 italic leading-relaxed">"{popup.topHighlight}"</p>
                </div>
              )}

              {popup.choice && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">Their choice:</span>
                  <span className="text-[11px] text-amber-400 font-medium">{popup.choice}</span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
