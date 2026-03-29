"use client";
import { useEffect } from "react";
import { auth, onAuthStateChanged } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!auth) {
      console.error("Firebase auth not initialized - check .env.local");
      setUser(null);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, [setUser]);

  return <>{children}</>;
}
