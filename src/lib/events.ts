import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import { LogEvent, Alert, LogType, BucketedEvents, Project } from "@/types/database";
import { calculateBucketRange } from "@/lib/bucketHelpers";
import { getSubscriptionLimits } from "@/lib/subscription";

export interface EventsQueryOptions {
  projectId: string;
  startTime: Date;
  endTime: Date;
  filters?: {
    messages?: string[];
    logTypes?: LogType[];
    search?: string;
  };
  limit?: number;
}

export interface AlertsQueryOptions {
  projectId: string;
  startTime: Date;
  endTime: Date;
}

export class EventsService {
  static async queryEvents(options: EventsQueryOptions): Promise<LogEvent[]> {
    const { projectId, startTime, endTime, filters, limit = 1000 } = options;

    console.log(`[Firebase READ - Events] Querying events for project ${projectId}`);
    console.log(`[Firebase READ - Events] Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);

    // Get project to determine bucket configuration
    const projectDoc = await adminDb.collection("projects").doc(projectId).get();
    if (!projectDoc.exists) {
      throw new Error("Project not found");
    }
    const project = projectDoc.data() as Project;
    const limits = project.subscriptionLimits || getSubscriptionLimits(project.subscriptionTier || "basic");
    const bucketMinutes = limits.eventBucketMinutes;

    // Get all bucket IDs for the time range
    const bucketIds = calculateBucketRange(projectId, startTime, endTime, bucketMinutes);
    console.log(`[Firebase READ - Events] Querying ${bucketIds.length} buckets`);

    // Query all relevant buckets
    const bucketPromises = bucketIds.map(bucketId => 
      adminDb.collection("bucketedEvents").doc(bucketId).get()
    );
    
    const bucketDocs = await Promise.all(bucketPromises);

    // Extract all events from buckets
    let allEvents: LogEvent[] = [];
    for (const bucketDoc of bucketDocs) {
      if (bucketDoc.exists) {
        const bucketData = bucketDoc.data() as any;
        if (bucketData.events) {
          const bucketEvents = bucketData.events.map((event: any, index: number) => ({
            ...event,
            id: `${bucketDoc.id}_${index}`,
            timestamp: event.timestamp?.toDate ? event.timestamp.toDate() : new Date(event.timestamp)
          }));
          
          // Filter events within exact time range
          const eventsInRange = bucketEvents.filter((event: LogEvent) => 
            event.timestamp >= startTime && event.timestamp <= endTime
          );
          
          allEvents = allEvents.concat(eventsInRange);
        }
      }
    }

    console.log(`[Firebase READ - Events] Found ${allEvents.length} total events from buckets`);

    // Apply type filter if specified
    if (filters?.logTypes && filters.logTypes.length > 0) {
      console.log(`[EventsService.queryEvents] Filtering by log types:`, filters.logTypes);
      allEvents = allEvents.filter(event => 
        filters.logTypes!.includes(event.type)
      );
    }

    // Filter by messages if specified
    if (filters?.messages && filters.messages.length > 0) {
      console.log(`[EventsService.queryEvents] Filtering by messages:`, filters.messages);
      allEvents = allEvents.filter(event => 
        filters.messages!.some(msg => event.message.includes(msg))
      );
      console.log(`[EventsService.queryEvents] After message filter: ${allEvents.length} events`);
    }

    // Apply search filter if specified
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      console.log(`[EventsService.queryEvents] Filtering by search term:`, filters.search);
      allEvents = allEvents.filter(event =>
        event.message.toLowerCase().includes(searchLower) ||
        (event.meta && JSON.stringify(event.meta).toLowerCase().includes(searchLower)) ||
        (event.userId && event.userId.toLowerCase().includes(searchLower))
      );
      console.log(`[EventsService.queryEvents] After search filter: ${allEvents.length} events`);
    }

    // Sort by timestamp (newest first) and apply limit
    allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const limitedEvents = allEvents.slice(0, limit);

    // Log sample event for debugging
    if (limitedEvents.length > 0) {
      console.log(`[EventsService.queryEvents] Sample event:`, {
        id: limitedEvents[0].id,
        type: limitedEvents[0].type,
        message: limitedEvents[0].message,
        timestamp: limitedEvents[0].timestamp,
      });
    }

    return limitedEvents;
  }

  static async queryAlerts(options: AlertsQueryOptions): Promise<Alert[]> {
    const { projectId, startTime, endTime } = options;

    console.log(`[Firebase READ - Alerts] Querying alerts for project ${projectId}`);
    console.log(`[Firebase READ - Alerts] Time range: ${startTime.toISOString()} to ${endTime.toISOString()}`);

    const query = adminDb
      .collection("alerts")
      .where("projectId", "==", projectId)
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(startTime))
      .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(endTime))
      .orderBy("createdAt", "desc");

    const snapshot = await query.get();
    console.log(`[Firebase READ - Alerts] Found ${snapshot.size} alerts from Firestore`);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      sentAt: doc.data().sentAt?.toDate(),
      windowStart: doc.data().windowStart?.toDate() || new Date(),
      windowEnd: doc.data().windowEnd?.toDate() || new Date(),
      acknowledgedAt: doc.data().acknowledgedAt?.toDate(),
    })) as Alert[];
  }

  static async queryEventsInChunks(
    projectId: string,
    startTime: Date,
    endTime: Date,
    filters?: { messages?: string[]; logTypes?: LogType[] },
  ): Promise<LogEvent[]> {
    const allEvents: LogEvent[] = [];
    const chunkSize = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    let currentStart = new Date(startTime);
    let chunkCount = 0;

    while (currentStart < endTime) {
      const currentEnd = new Date(Math.min(currentStart.getTime() + chunkSize, endTime.getTime()));
      chunkCount++;

      console.log(`[Firebase READ - Events] Chunk ${chunkCount}: ${currentStart.toISOString()} to ${currentEnd.toISOString()}`);

      const chunkEvents = await this.queryEvents({
        projectId,
        startTime: currentStart,
        endTime: currentEnd,
        filters,
        limit: 5000, // Higher limit per chunk
      });

      console.log(`[Firebase READ - Events] Chunk ${chunkCount} returned ${chunkEvents.length} events`);
      allEvents.push(...chunkEvents);
      currentStart = new Date(currentEnd.getTime() + 1);
    }

    return allEvents;
  }

  static aggregateEventsByStepSize(
    events: LogEvent[],
    stepSizeMinutes: number,
    startTime: Date,
    endTime: Date,
  ): Record<string, Record<LogType, number>> {
    const stepSizeMs = stepSizeMinutes * 60 * 1000;
    const aggregated: Record<string, Record<LogType, number>> = {};

    // Initialize time buckets - align to step boundaries
    const alignedStartTime = new Date(Math.floor(startTime.getTime() / stepSizeMs) * stepSizeMs);
    const alignedEndTime = new Date(Math.ceil(endTime.getTime() / stepSizeMs) * stepSizeMs);
    
    let currentTime = new Date(alignedStartTime);
    let bucketCount = 0;
    while (currentTime < alignedEndTime) {
      const bucketKey = currentTime.toISOString();
      aggregated[bucketKey] = {
        text: 0,
        call: 0,
        callText: 0,
        log: 0,
        warn: 0,
        error: 0,
      };
      currentTime = new Date(currentTime.getTime() + stepSizeMs);
      bucketCount++;
    }

    // Count events by type
    const typeCounts: Record<LogType, number> = {
      text: 0,
      call: 0,
      callText: 0,
      log: 0,
      warn: 0,
      error: 0,
    };

    // Aggregate events into buckets
    let aggregatedCount = 0;
    let skippedCount = 0;
    events.forEach((event, index) => {
      const eventTime = new Date(event.timestamp);
      const bucketStart = new Date(Math.floor(eventTime.getTime() / stepSizeMs) * stepSizeMs);

      // Check if the bucket exists in our aggregated object
      const bucketKey = bucketStart.toISOString();
      if (aggregated[bucketKey]) {
        aggregated[bucketKey][event.type]++;
        typeCounts[event.type]++;
        aggregatedCount++;
      } else {
        skippedCount++;
      }
    });

    return aggregated;
  }

  static aggregateEventsByMessage(events: LogEvent[]): Array<{
    message: string;
    count: number;
    logTypes: LogType[];
  }> {
    const messageMap = new Map<string, { count: number; types: Set<LogType> }>();

    events.forEach((event) => {
      const existing = messageMap.get(event.message) || { count: 0, types: new Set() };
      existing.count++;
      existing.types.add(event.type);
      messageMap.set(event.message, existing);
    });

    return Array.from(messageMap.entries())
      .map(([message, data]) => ({
        message,
        count: data.count,
        logTypes: Array.from(data.types),
      }))
      .sort((a, b) => b.count - a.count);
  }
}
