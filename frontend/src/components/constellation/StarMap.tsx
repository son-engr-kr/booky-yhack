"use client";

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
  const W = 400;
  const H = 500;

  const getPos = (r: Reader) => ({
    x: r.position.x * W,
    y: r.position.y * H,
  });

  const getReader = (id: string) => readers.find((r) => r.userId === id);

  const similarityColor = (s: number) => {
    if (s >= 85) return "#f59e0b";
    if (s >= 70) return "#818cf8";
    if (s >= 55) return "#34d399";
    return "#6b7280";
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-full"
      style={{ maxHeight: "100%" }}
    >
      <defs>
        <filter id="glow-gold">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="glow-soft">
          <feGaussianBlur stdDeviation="2" result="blur" />
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
        const fp = getPos(from);
        const tp = getPos(to);
        return (
          <line
            key={i}
            x1={fp.x}
            y1={fp.y}
            x2={tp.x}
            y2={tp.y}
            stroke="white"
            strokeOpacity={conn.strength * 0.35}
            strokeWidth={conn.strength * 1.5}
          />
        );
      })}

      {/* Stars */}
      {readers.map((reader) => {
        const pos = getPos(reader);
        const isMe = reader.isMe;
        const r = isMe ? 14 : 6 + reader.similarity * 0.06;
        const color = isMe ? "#f59e0b" : similarityColor(reader.similarity);

        return (
          <g
            key={reader.userId}
            onClick={() => onStarTap(reader)}
            style={{ cursor: "pointer" }}
          >
            {isMe && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r + 6}
                fill="none"
                stroke="#f59e0b"
                strokeOpacity={0.25}
                strokeWidth={1.5}
              />
            )}
            <motion.circle
              cx={pos.x}
              cy={pos.y}
              r={r}
              fill={color}
              fillOpacity={isMe ? 1 : 0.8}
              filter={isMe ? "url(#glow-gold)" : "url(#glow-soft)"}
              animate={
                isMe
                  ? { r: [r, r + 1.5, r] }
                  : { r: [r, r + 0.8, r], fillOpacity: [0.8, 1, 0.8] }
              }
              transition={{ duration: isMe ? 2 : 3 + Math.random() * 2, repeat: Infinity }}
            />
            <circle
              cx={pos.x}
              cy={pos.y}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={isMe ? 2 : 1}
              strokeOpacity={0.6}
            />
            {isMe && (
              <text
                x={pos.x}
                y={pos.y + r + 12}
                textAnchor="middle"
                fill="#f59e0b"
                fontSize={9}
                fontWeight="600"
              >
                You
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
