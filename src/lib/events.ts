import { adminDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import { LogEvent, Alert, LogType } from "@/types/database";

export interface EventsQueryOptions {
  projectId: string;
  startTime: Date;
  endTime: Date;
  filters?: {
    messages?: string[];
    logTypes?: LogType[];
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

    let query = adminDb
      .collection("events")
      .where("projectId", "==", projectId)
      .where("timestamp", ">=", admin.firestore.Timestamp.fromDate(startTime))
      .where("timestamp", "<=", admin.firestore.Timestamp.fromDate(endTime))
      .orderBy("timestamp", "desc")
      .limit(limit);

    if (filters?.logTypes && filters.logTypes.length > 0) {
      console.log(`[EventsService.queryEvents] Filtering by log types:`, filters.logTypes);
      query = query.where("type", "in", filters.logTypes);
    }

    const snapshot = await query.get();
    console.log(`[Firebase READ - Events] Found ${snapshot.size} events from Firestore`);

    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Check if timestamp exists and is a Firestore Timestamp
      if (!data.timestamp) {
        console.warn(`[EventsService.queryEvents] Event ${doc.id} has no timestamp field`);
      }
      const timestamp = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp || Date.now());
      return {
        id: doc.id,
        ...data,
        timestamp: timestamp,
      };
    }) as LogEvent[];

    // Log sample event for debugging
    if (events.length > 0) {
      console.log(`[EventsService.queryEvents] Sample event:`, {
        id: events[0].id,
        type: events[0].type,
        message: events[0].message,
        timestamp: events[0].timestamp,
      });
    }

    // Filter by messages in memory if specified
    if (filters?.messages && filters.messages.length > 0) {
      console.log(`[EventsService.queryEvents] Filtering by messages:`, filters.messages);
      const filtered = events.filter((event) => 
        filters.messages!.some((msg) => event.message.includes(msg))
      );
      console.log(`[EventsService.queryEvents] After message filter: ${filtered.length} events`);
      return filtered;
    }

    return events;
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
    console.log(`[queryEventsInChunks] Starting chunked query for project ${projectId}`);
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

    console.log(`[queryEventsInChunks] Total events from all ${chunkCount} chunks: ${allEvents.length}`);
    return allEvents;
  }

  static aggregateEventsByStepSize(
    events: LogEvent[],
    stepSizeMinutes: number,
    startTime: Date,
    endTime: Date,
  ): Record<string, Record<LogType, number>> {
    console.log(`[aggregateEventsByStepSize] Aggregating ${events.length} events with step size ${stepSizeMinutes} minutes`);
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
    console.log(`[aggregateEventsByStepSize] Created ${bucketCount} time buckets`);
    console.log(`[aggregateEventsByStepSize] First bucket: ${alignedStartTime.toISOString()}`);
    console.log(`[aggregateEventsByStepSize] Last bucket: ${new Date(currentTime.getTime() - stepSizeMs).toISOString()}`);

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

      // Debug first few events
      if (index < 3) {
        console.log(`[aggregateEventsByStepSize] Event ${index}: time=${eventTime.toISOString()}, bucketStart=${bucketStart.toISOString()}, type=${event.type}`);
      }

      // Check if the bucket exists in our aggregated object
      const bucketKey = bucketStart.toISOString();
      if (aggregated[bucketKey]) {
        aggregated[bucketKey][event.type]++;
        typeCounts[event.type]++;
        aggregatedCount++;
      } else {
        skippedCount++;
        if (skippedCount <= 3) {
          console.log(`[aggregateEventsByStepSize] Event outside bucket range: ${eventTime.toISOString()} (bucket: ${bucketStart.toISOString()})`);
        }
      }
    });

    if (skippedCount > 0) {
      console.log(`[aggregateEventsByStepSize] Skipped ${skippedCount} events outside time range`);
    }

    console.log(`[aggregateEventsByStepSize] Aggregated ${aggregatedCount} events into buckets`);
    console.log(`[aggregateEventsByStepSize] Event type distribution:`, typeCounts);

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
