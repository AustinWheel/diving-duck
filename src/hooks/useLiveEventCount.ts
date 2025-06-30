import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebaseClient";
import { collection, query, where, onSnapshot } from "firebase/firestore";

interface UseLiveEventCountOptions {
  projectId: string | null;
  enabled?: boolean;
}

export function useLiveEventCount({ projectId, enabled = true }: UseLiveEventCountOptions) {
  const [count, setCount] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch total count directly from Firestore
  const fetchTotalCount = useCallback(async () => {
    if (!projectId) return;

    try {
      // Get all bucketed events for this project and sum the counts
      const bucketedEventsQuery = query(
        collection(db, "bucketedEvents"),
        where("projectId", "==", projectId)
      );
      
      let totalCount = 0;
      const unsubscribe = onSnapshot(
        bucketedEventsQuery,
        (snapshot) => {
          totalCount = 0;
          snapshot.forEach((doc) => {
            const data = doc.data();
            totalCount += data.eventCount || 0;
          });
          setCount(totalCount);
          setIsConnected(true);
          setError(null);
        },
        (error) => {
          console.error("Error fetching event count:", error);
          setError("Failed to load event count");
          setIsConnected(false);
        }
      );

      // Store unsubscribe function for cleanup
      return unsubscribe;
    } catch (err) {
      console.error("Error setting up event count listener:", err);
      setError("Failed to load event count");
      setIsConnected(false);
      return () => {}; // Return empty cleanup function
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !enabled) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    // Set up the real-time listener
    const setupListener = async () => {
      unsubscribe = await fetchTotalCount();
    };

    setupListener();

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [projectId, enabled, fetchTotalCount]);

  return { count, isConnected, error };
}