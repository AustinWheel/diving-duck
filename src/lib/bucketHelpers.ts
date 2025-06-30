// Helper functions for bucket calculations

// Helper to calculate bucket ID based on timestamp and bucket duration
export function calculateBucketId(
  projectId: string,
  timestamp: Date,
  bucketMinutes: number,
): string {
  const date = new Date(timestamp);

  // Round down to nearest bucket interval
  const totalMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const bucketStartMinutes = Math.floor(totalMinutes / bucketMinutes) * bucketMinutes;

  const bucketHours = Math.floor(bucketStartMinutes / 60);
  const bucketMins = bucketStartMinutes % 60;

  // Format: projectId_YYYYMMDD_HHmm
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(bucketHours).padStart(2, "0");
  const min = String(bucketMins).padStart(2, "0");

  return `${projectId}_${year}${month}${day}_${hour}${min}`;
}

// Helper to calculate bucket start and end times
export function calculateBucketTimes(
  timestamp: Date,
  bucketMinutes: number,
): { start: Date; end: Date } {
  const date = new Date(timestamp);

  // Round down to nearest bucket interval
  const totalMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const bucketStartMinutes = Math.floor(totalMinutes / bucketMinutes) * bucketMinutes;

  const start = new Date(date);
  start.setUTCHours(Math.floor(bucketStartMinutes / 60));
  start.setUTCMinutes(bucketStartMinutes % 60);
  start.setUTCSeconds(0);
  start.setUTCMilliseconds(0);

  const end = new Date(start);
  end.setUTCMinutes(end.getUTCMinutes() + bucketMinutes);

  return { start, end };
}

// Helper to calculate bucket IDs for a time range
export function calculateBucketRange(
  projectId: string,
  startTime: Date,
  endTime: Date,
  bucketMinutes: number,
): string[] {
  const bucketIds: string[] = [];

  // Round start time down to nearest bucket
  const start = new Date(startTime);
  const totalStartMinutes = start.getUTCHours() * 60 + start.getUTCMinutes();
  const bucketStartMinutes = Math.floor(totalStartMinutes / bucketMinutes) * bucketMinutes;
  start.setUTCHours(Math.floor(bucketStartMinutes / 60));
  start.setUTCMinutes(bucketStartMinutes % 60);
  start.setUTCSeconds(0);
  start.setUTCMilliseconds(0);

  // Generate bucket IDs for each interval
  const current = new Date(start);
  while (current <= endTime) {
    const year = current.getUTCFullYear();
    const month = String(current.getUTCMonth() + 1).padStart(2, "0");
    const day = String(current.getUTCDate()).padStart(2, "0");
    const hour = String(current.getUTCHours()).padStart(2, "0");
    const min = String(current.getUTCMinutes()).padStart(2, "0");

    bucketIds.push(`${projectId}_${year}${month}${day}_${hour}${min}`);

    // Move to next bucket
    current.setUTCMinutes(current.getUTCMinutes() + bucketMinutes);
  }

  return bucketIds;
}
