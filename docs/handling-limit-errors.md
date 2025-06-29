# Handling Subscription Limit Errors

When using the Console Warden SDK, you may encounter rate limits or subscription limits. Here's how to handle them properly:

## Error Response Format

When a limit is reached, the API returns a structured error response:

```json
{
  "error": "Daily event limit exceeded",
  "message": "You've reached your daily limit of 500 events. You've sent 500 events today.",
  "suggestion": "Upgrade to Pro for 50,000 events per day, or wait for the daily reset.",
  "details": {
    "limit": 500,
    "current": 500,
    "resetAt": "2024-01-02T00:00:00.000Z",
    "hoursUntilReset": 6,
    "tier": "basic"
  }
}
```

## HTTP Status Codes

- **429 Too Many Requests**: For rate limits (daily events, daily alerts)
- **403 Forbidden**: For hard limits (team members, API keys, configuration limits)

## SDK Error Handling

### JavaScript/TypeScript

```javascript
import 'console-warden';

// Wrap your logging in try-catch or handle the promise
try {
  console.text('Important event');
} catch (error) {
  if (error.status === 429) {
    console.error('Rate limit reached:', error.message);
    console.log('Will reset at:', error.details.resetAt);
    
    // Implement backoff or queue events locally
    queueEventForLater(event);
  }
}
```

### React Example

```typescript
const handleEvent = async () => {
  try {
    await logEvent('User action');
  } catch (error) {
    if (error.status === 429 || error.status === 403) {
      // Show user-friendly error
      showNotification({
        title: error.error,
        message: error.message,
        action: error.suggestion.includes('Upgrade') ? 'View Plans' : null
      });
    }
  }
};
```

## Best Practices

1. **Implement Exponential Backoff**: For rate limits, wait before retrying
2. **Queue Events Locally**: Store events when limits are hit and retry later
3. **Monitor Usage**: Check your dashboard regularly to track usage
4. **Set Up Alerts**: Configure alerts before hitting limits
5. **Upgrade Proactively**: If consistently hitting limits, consider upgrading

## Limit Types

### Rate Limits (429)
- **Daily Events**: Resets at midnight UTC
- **Daily Alerts**: Resets at midnight UTC

### Hard Limits (403)
- **Team Members**: Total members including owner
- **API Keys**: Active keys per type
- **Phone Numbers**: For alert configuration
- **Alert Rules**: Number of alert configurations
- **Test Alerts**: Lifetime limit on free tier

## Example: Graceful Degradation

```javascript
class EventLogger {
  constructor() {
    this.queue = [];
    this.retryTimer = null;
  }

  async log(message, meta) {
    try {
      await console.text(message, meta);
    } catch (error) {
      if (error.status === 429) {
        // Queue for later
        this.queue.push({ message, meta, timestamp: Date.now() });
        
        // Schedule retry after reset
        if (!this.retryTimer && error.details?.hoursUntilReset) {
          const retryDelay = error.details.hoursUntilReset * 60 * 60 * 1000;
          this.retryTimer = setTimeout(() => this.flushQueue(), retryDelay);
        }
        
        // Log locally as fallback
        console.log(`[QUEUED] ${message}`, meta);
      } else {
        // Re-throw other errors
        throw error;
      }
    }
  }

  async flushQueue() {
    const events = [...this.queue];
    this.queue = [];
    this.retryTimer = null;

    for (const event of events) {
      try {
        await console.text(event.message, event.meta);
      } catch (error) {
        // Re-queue if still failing
        this.queue.push(event);
      }
    }
  }
}
```

## Monitoring Usage

Check your current usage at any time:

1. Visit your [Console Warden Dashboard](https://console-warden.com/dashboard)
2. Navigate to the Subscription page
3. View real-time usage metrics and limits
4. Set up alerts before reaching limits