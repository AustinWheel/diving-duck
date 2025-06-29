import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { EventsService } from "@/lib/events";
import { Project, LogType, LogEvent, Alert } from "@/types/database";
import { adminDb } from "@/lib/firebaseAdmin";

interface AggregateRequest {
  startTime: string;
  endTime: string;
  stepSize: number; // in minutes
  filters?: {
    messages?: string[];
    logTypes?: LogType[];
  };
}

// In-memory cache for events and alerts
interface CacheEntry {
  events: LogEvent[];
  alerts: Alert[];
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// Generate cache key from request parameters
function getCacheKey(projectId: string, startTime: string, endTime: string, filters?: any): string {
  const filterKey = filters ? JSON.stringify(filters) : 'no-filters';
  return `${projectId}:${startTime}:${endTime}:${filterKey}`;
}

// Check if cache entry is still valid
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

// Clean up expired cache entries
function cleanupCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp >= CACHE_TTL) {
      cache.delete(key);
      console.log(`[Cache] Removed expired entry: ${key}`);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7);

    // Verify the Firebase ID token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (error) {
      return NextResponse.json({ error: "Invalid authentication token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    // Get project ID from query params
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    // Verify user has access to this project
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const projectData = projectDoc.data()! as Project;

    // Verify user is a member or owner
    if (projectData.ownerId !== userId && !projectData.memberIds?.includes(userId)) {
      return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });
    }

    // Parse request body
    const body: AggregateRequest = await request.json();
    const { startTime, endTime, stepSize, filters } = body;

    // Validate time range
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: "Invalid start or end time" }, { status: 400 });
    }

    // Limit to 2 weeks maximum
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    if (end.getTime() - start.getTime() > twoWeeksMs) {
      return NextResponse.json({ error: "Time range cannot exceed 2 weeks" }, { status: 400 });
    }

    // Validate step size
    const validStepSizes = [60, 120, 180, 240, 300, 360, 720, 1440];
    if (!validStepSizes.includes(stepSize)) {
      return NextResponse.json({ error: "Invalid step size" }, { status: 400 });
    }

    // Clean up expired cache entries periodically
    cleanupCache();

    // Check cache first
    const cacheKey = getCacheKey(projectId, startTime, endTime, filters);
    const cachedEntry = cache.get(cacheKey);
    
    let events: LogEvent[];
    let alerts: Alert[];

    if (cachedEntry && isCacheValid(cachedEntry)) {
      // Use cached data
      console.log(`[Cache HIT] Using cached data for key: ${cacheKey}`);
      console.log(`[Cache HIT] Cached ${cachedEntry.events.length} events and ${cachedEntry.alerts.length} alerts`);
      console.log(`[Cache HIT] Cache age: ${Math.round((Date.now() - cachedEntry.timestamp) / 1000)}s`);
      events = cachedEntry.events;
      alerts = cachedEntry.alerts;
    } else {
      // Query events and alerts in parallel
      console.log(`[Cache MISS] No valid cache for key: ${cacheKey}`);
      if (cachedEntry) {
        console.log(`[Cache MISS] Cache expired, age: ${Math.round((Date.now() - cachedEntry.timestamp) / 1000)}s`);
      }
      console.log(`[Firebase READ] Starting queries for project ${projectId}`);
      console.log(`[Firebase READ] Time range: ${start.toISOString()} to ${end.toISOString()}`);
      console.log(`[Firebase READ] Step size: ${stepSize} minutes`);
      console.log(`[Firebase READ] Filters:`, filters);

      const startTime = Date.now();
      [events, alerts] = await Promise.all([
        EventsService.queryEventsInChunks(projectId, start, end, filters),
        EventsService.queryAlerts({ projectId, startTime: start, endTime: end }),
      ]);
      const queryTime = Date.now() - startTime;

      console.log(`[Firebase READ] Completed in ${queryTime}ms`);
      console.log(`[Firebase READ] Retrieved ${events.length} events and ${alerts.length} alerts`);
      
      // Store in cache
      cache.set(cacheKey, {
        events,
        alerts,
        timestamp: Date.now(),
      });
      console.log(`[Cache WRITE] Stored data for key: ${cacheKey}`);
    }

    // Aggregate data for the chart
    const chartData = EventsService.aggregateEventsByStepSize(events, stepSize, start, end);
    // Transform chart data for recharts format
    const timeSeriesData = Object.entries(chartData).map(([timestamp, counts]) => {
      const bucketAlerts = alerts.filter((alert) => {
        const alertTime = new Date(alert.createdAt);
        const bucketTime = new Date(timestamp);
        const nextBucketTime = new Date(bucketTime.getTime() + stepSize * 60 * 1000);
        return alertTime >= bucketTime && alertTime < nextBucketTime;
      });

      return {
        timestamp,
        ...counts,
        alerts: bucketAlerts.length,
        alertDetails: bucketAlerts, // Include alert details for the label
      };
    });

    // Aggregate by message
    const messageAggregated = EventsService.aggregateEventsByMessage(events);

    // Get recent alerts
    const recentAlerts = alerts
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map((alert) => ({
        id: alert.id,
        message: alert.message,
        status: alert.status,
        eventCount: alert.eventCount,
        createdAt: alert.createdAt,
        sentTo: alert.sentTo,
      }));

    return NextResponse.json({
      timeSeriesData,
      messageAggregated: messageAggregated.slice(0, 20), // Top 20 messages
      recentAlerts,
      summary: {
        totalEvents: events.length,
        totalAlerts: alerts.length,
        uniqueMessages: messageAggregated.length,
      },
    });
  } catch (error) {
    console.error("Error aggregating events:", error);
    return NextResponse.json({ error: "Failed to aggregate events" }, { status: 500 });
  }
}
