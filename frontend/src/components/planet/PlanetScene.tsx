"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Html } from "@react-three/drei";
import { Suspense, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

interface FriendPlanetData {
  id: string;
  name: string;
  planetImage: string;
  similarity: number;
  position: { x: number; y: number; z: number };
  latestFeed?: string;
}

interface SatelliteData {
  bookId: string;
  bookTitle: string;
  status: string;
}

interface PlanetSceneProps {
  myPlanet: {
    planetImage: string;
    name: string;
    level: number;
    booksRead: number;
    totalNotes: number;
    totalChoices: number;
    genres: Record<string, number>;
    satellites: SatelliteData[];
  };
  friendPlanets: FriendPlanetData[];
  onPlanetTap?: (type: "me" | "friend", id?: string) => void;
}

function MyPlanet({
  planetImage,
  satellites,
  onTap,
}: {
  planetImage: string;
  satellites: SatelliteData[];
  onTap: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.15;
    }
    if (glowRef.current) {
      glowRef.current.rotation.y -= delta * 0.05;
    }
  });

  return (
    <group>
      {/* Glow ring */}
      <mesh ref={glowRef}>
        <torusGeometry args={[1.4, 0.02, 16, 64]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.15} />
      </mesh>

      {/* Planet sphere */}
      <mesh ref={meshRef} onClick={onTap}>
        <sphereGeometry args={[0.8, 64, 64]} />
        <meshStandardMaterial
          color="#386641"
          roughness={0.7}
          metalness={0.3}
          emissive="#1a472a"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Atmosphere */}
      <mesh scale={[1.05, 1.05, 1.05]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial
          color="#6a994e"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Satellites (books) */}
      {satellites.map((sat, i) => (
        <Satellite
          key={sat.bookId}
          index={i}
          total={satellites.length}
          title={sat.bookTitle}
          status={sat.status}
        />
      ))}
    </group>
  );
}

function Satellite({
  index,
  total,
  title,
  status,
}: {
  index: number;
  total: number;
  title: string;
  status: string;
}) {
  const ref = useRef<THREE.Group>(null);
  const angle = (index / total) * Math.PI * 2;
  const radius = 1.6;
  const speed = 0.3 + index * 0.05;

  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime * speed + angle;
      ref.current.position.x = Math.cos(t) * radius;
      ref.current.position.z = Math.sin(t) * radius;
      ref.current.position.y = Math.sin(t * 0.5) * 0.2;
    }
  });

  const colors: Record<string, string> = {
    reading: "#FFD700",
    completed: "#4ECDC4",
    "not-started": "#666",
  };

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={colors[status] || "#888"}
          emissive={colors[status] || "#888"}
          emissiveIntensity={0.3}
        />
      </mesh>
      <Html distanceFactor={8} style={{ pointerEvents: "none" }}>
        <div className="text-[8px] text-white/60 whitespace-nowrap font-medium bg-black/40 px-1 rounded">
          {(title || "Book").length > 12 ? (title || "Book").slice(0, 12) + "..." : title || "Book"}
        </div>
      </Html>
    </group>
  );
}

function FriendPlanetMesh({
  data,
  onTap,
}: {
  data: FriendPlanetData;
  onTap: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const scale = 0.3 + (data.similarity / 100) * 0.3;

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.2;
    }
  });

  const planetColors: Record<string, string> = {
    "planet1.png": "#2a2040",
    "planet2.png": "#386641",
    "planet3.png": "#9b6a3a",
  };

  return (
    <group position={[data.position.x, data.position.y, data.position.z]}>
      <mesh
        ref={ref}
        onClick={onTap}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? scale * 1.2 : scale}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={planetColors[data.planetImage] || "#555"}
          roughness={0.6}
          metalness={0.4}
          emissive={planetColors[data.planetImage] || "#333"}
          emissiveIntensity={hovered ? 0.4 : 0.15}
        />
      </mesh>
      {/* Name label */}
      <Html distanceFactor={6} style={{ pointerEvents: "none" }}>
        <div className="text-[9px] text-white/80 whitespace-nowrap font-semibold">
          {data.name} · {data.similarity}%
        </div>
      </Html>
    </group>
  );
}

function SpeechBubble({
  data,
  visible,
}: {
  data: FriendPlanetData;
  visible: boolean;
}) {
  if (!data.latestFeed || !visible) return null;

  return (
    <Html
      position={[
        data.position.x,
        data.position.y + 0.8,
        data.position.z,
      ]}
      distanceFactor={5}
      style={{ pointerEvents: "none" }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -3, scale: 0.95 }}
          transition={{ duration: 0.5 }}
          className="bg-black/70 backdrop-blur-md border border-amber-500/20 rounded-lg px-2 py-1 max-w-[100px]"
        >
          <div className="text-[7px] text-amber-400 font-semibold">
            {data.name}
          </div>
          <div className="text-[7px] text-gray-300 leading-tight">
            {data.latestFeed.length > 50
              ? data.latestFeed.slice(0, 50) + "..."
              : data.latestFeed}
          </div>
        </motion.div>
      </AnimatePresence>
    </Html>
  );
}

function ShootingStar() {
  const ref = useRef<THREE.Mesh>(null);
  const [active, setActive] = useState(false);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!active && Math.random() < 0.002) {
      setActive(true);
      setTimeout(() => setActive(false), 800);
    }
    if (ref.current && active) {
      ref.current.position.x -= 0.15;
      ref.current.position.y -= 0.08;
    }
  });

  if (!active) return null;

  return (
    <mesh ref={ref} position={[8, 5, -10]}>
      <sphereGeometry args={[0.02, 4, 4]} />
      <meshBasicMaterial color="#fff" />
    </mesh>
  );
}

function Porthole() {
  const { viewport } = useThree();

  return (
    <>
      {/* Circular porthole rim rendered in screen space via Html */}
      <Html fullscreen style={{ pointerEvents: "none" }}>
        <div className="absolute inset-0 pointer-events-none">
          {/* Top bezel curve */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              width: "165vw",
              aspectRatio: "1",
              borderRadius: "50%",
              top: "45%",
              transform: "translateX(-50%) translateY(-50%)",
              boxShadow: `
                0 0 0 2px #555,
                0 0 0 5px #a0a5b0,
                0 0 0 6px #888e9a,
                0 0 0 60px #eceef4,
                0 0 0 61px #dde0ea,
                0 0 0 64px #f0f2f8
              `,
            }}
          />
        </div>
      </Html>
    </>
  );
}

function Scene({
  myPlanet,
  friendPlanets,
  onPlanetTap,
}: PlanetSceneProps) {
  const [bubbleIndex, setBubbleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setBubbleIndex((prev) => (prev + 1) % friendPlanets.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [friendPlanets.length]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 3, 5]} intensity={1} color="#FFD700" />
      <pointLight position={[-3, -2, -3]} intensity={0.3} color="#4466ff" />

      <Stars
        radius={50}
        depth={80}
        count={3000}
        factor={3}
        saturation={0.2}
        fade
        speed={0.5}
      />

      <ShootingStar />
      <ShootingStar />

      <MyPlanet
        planetImage={myPlanet.planetImage}
        satellites={myPlanet.satellites}
        onTap={() => onPlanetTap?.("me")}
      />

      {friendPlanets.map((fp, i) => (
        <group key={fp.id}>
          <FriendPlanetMesh
            data={fp}
            onTap={() => onPlanetTap?.("friend", fp.id)}
          />
          <SpeechBubble data={fp} visible={i === bubbleIndex} />
        </group>
      ))}

      {/* Orbit lines */}
      {friendPlanets.map((fp) => (
        <line key={`line-${fp.id}`}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  0, 0, 0,
                  fp.position.x, fp.position.y, fp.position.z,
                ]),
                3,
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#FFD700"
            transparent
            opacity={fp.similarity / 400}
          />
        </line>
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={3}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export default function PlanetScene(props: PlanetSceneProps) {
  return (
    <div className="w-full h-full absolute inset-0">
      <Canvas
        camera={{ position: [0, 2, 6], fov: 50 }}
        style={{ background: "#050507" }}
      >
        <Suspense fallback={null}>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}
