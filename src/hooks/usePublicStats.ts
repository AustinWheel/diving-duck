import { useState, useEffect } from "react";
import { db } from "@/lib/firebaseClient";
import { doc, onSnapshot } from "firebase/firestore";

interface PublicStats {
  totalEvents: number;
  lastUpdated: any; // Firestore Timestamp
}

export function usePublicStats() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen to the public stats document
    const unsubscribe = onSnapshot(
      doc(db, "public", "stats"),
      (doc) => {
        if (doc.exists()) {
          setStats(doc.data() as PublicStats);
          setError(null);
        } else {
          setError("Stats not available");
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error listening to public stats:", error);
        setError("Failed to load stats");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { stats, loading, error };
}