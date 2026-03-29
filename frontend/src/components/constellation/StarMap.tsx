"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

interface Reader {
  userId: string;
  userName: string;
  similarity: number;
  position: { x: number; y: number };
  topHighlight?: string;
  choice?: string;
  isMe?: boolean;
}

interface Connection {
  from: string;
  to: string;
  strength: number;
}

interface StarMapProps {
  readers: Reader[];
  connections: Connection[];
  onStarTap: (reader: Reader) => void;
}

export default function StarMap({ readers, connections, onStarTap }: StarMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Map size
  const MAP_SIZE = 600;
  const CENTER = MAP_SIZE / 2;
  const PADDING = 80;

  // Normalize positions: find bounds, scale to fill map
  const positionedReaders = (() => {
    const nonMe = readers.filter((r) => !r.isMe);
    if (nonMe.length === 0) return readers.map((r) => ({ ...r, cx: CENTER, cy: CENTER }));

    const xs = nonMe.map((r) => r.position.x);
    const ys = nonMe.map((r) => r.position.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    return readers.map((r) => {
      if (r.isMe) {
        return { ...r, cx: CENTER, cy: CENTER };
      }
      // Normalize to 0~1 then scale to map with padding
      const nx = (r.position.x - minX) / rangeX;
      const ny = (r.position.y - minY) / rangeY;
      const cx = PADDING + nx * (MAP_SIZE - PADDING * 2);
      const cy = PADDING + ny * (MAP_SIZE - PADDING * 2);
      return { ...r, cx, cy };
    });
  })();

  const getReader = (id: string) => positionedReaders.find((r) => r.userId === id);

  // Pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      tx: transform.x,
      ty: transform.y,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, [transform.x, transform.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTransform((t) => ({
      ...t,
      x: dragStart.current.tx + dx,
      y: dragStart.current.ty + dy,
    }));
  }, [dragging]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  // Zoom handler
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform((t) => ({
      ...t,
      scale: Math.min(3, Math.max(0.3, t.scale * delta)),
    }));
  }, []);

  // Touch pinch zoom
  const lastTouchDist = useRef(0);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDist.current > 0) {
        const delta = dist / lastTouchDist.current;
        setTransform((t) => ({
          ...t,
          scale: Math.min(3, Math.max(0.3, t.scale * delta)),
        }));
      }
      lastTouchDist.current = dist;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastTouchDist.current = 0;
  }, []);

  // Center on load
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTransform({
        x: rect.width / 2 - CENTER * 0.8,
        y: rect.height / 2 - CENTER * 0.8,
        scale: 0.8,
      });
    }
  }, []);

  const similarityColor = (s: number) => {
    if (s >= 85) return "#f59e0b";
    if (s >= 70) return "#818cf8";
    if (s >= 55) return "#34d399";
    return "#6b7280";
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
          width: MAP_SIZE,
          height: MAP_SIZE,
          position: "relative",
        }}
      >
        {/* SVG layer for lines */}
        <svg
          width={MAP_SIZE}
          height={MAP_SIZE}
          className="absolute inset-0"
          style={{ pointerEvents: "none" }}
        >
          <defs>
            <filter id="glow-gold">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection lines */}
          {connections.map((conn, i) => {
            const from = getReader(conn.from);
            const to = getReader(conn.to);
            if (!from || !to) return null;
            return (
              <line
                key={i}
                x1={from.cx}
                y1={from.cy}
                x2={to.cx}
                y2={to.cy}
                stroke="white"
                strokeOpacity={conn.strength * 0.3}
                strokeWidth={conn.strength * 2}
              />
            );
          })}
        </svg>

        {/* Star nodes as HTML for better interaction */}
        {positionedReaders.map((reader) => {
          const isMe = reader.isMe;
          const size = isMe ? 36 : 20 + reader.similarity * 0.08;
          const color = isMe ? "#f59e0b" : similarityColor(reader.similarity);

          return (
            <motion.div
              key={reader.userId}
              className="absolute flex flex-col items-center cursor-pointer"
              style={{
                left: reader.cx - size / 2,
                top: reader.cy - size / 2,
              }}
              whileHover={{ scale: 1.3 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                onStarTap(reader);
              }}
            >
              {/* Outer glow for Me */}
              {isMe && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: size + 16,
                    height: size + 16,
                    left: -8,
                    top: -8,
                    border: "1.5px solid rgba(245,158,11,0.25)",
                  }}
                  animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}

              {/* Star circle */}
              <motion.div
                className="rounded-full flex items-center justify-center font-bold"
                style={{
                  width: size,
                  height: size,
                  backgroundColor: isMe ? color : `${color}cc`,
                  border: `2px solid ${color}`,
                  boxShadow: `0 0 ${isMe ? 16 : 8}px ${color}40`,
                  fontSize: isMe ? 12 : 9,
                  color: "#fff",
                }}
                animate={
                  isMe
                    ? { boxShadow: [`0 0 16px ${color}40`, `0 0 24px ${color}60`, `0 0 16px ${color}40`] }
                    : { opacity: [0.85, 1, 0.85] }
                }
                transition={{ duration: isMe ? 2 : 3, repeat: Infinity }}
              >
                {isMe ? "Me" : reader.userName?.[0] || "?"}
              </motion.div>

              {/* Name label */}
              <div
                className="mt-1 text-center whitespace-nowrap"
                style={{
                  fontSize: isMe ? 10 : 8,
                  color: isMe ? "#f59e0b" : "#999",
                  fontWeight: isMe ? 700 : 500,
                }}
              >
                {isMe ? "You" : reader.userName || reader.userId}
                {!isMe && (
                  <span style={{ color: "#666", marginLeft: 3, fontSize: 7 }}>
                    {reader.similarity}%
                  </span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-gray-600 pointer-events-none">
        Drag to pan · Scroll to zoom
      </div>
    </div>
  );
}
