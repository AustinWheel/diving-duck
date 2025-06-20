# Project: Developer Alerting Tool

## Overview
A lightweight alerting service for developers that extends `console.text()` to trigger real-time alerts. Built for fast setup, small teams, and practical notifications (SMS first, then call escalation).

## Key Technologies
- **Frontend**: Next.js with Once UI components
- **Backend**: Next.js API routes
- **Database**: Firebase (Firestore + Auth)
  - Server-side: Use Firebase Admin SDK
  - Client-side: Use Firebase Client SDK
- **UI Components**: Always use Once UI for frontend work
- **External NPM Package**: Already published and available for users

## Architecture

### API Structure
- Versioned API routes: `/api/v1/*`
- Authentication: Bearer tokens with `test_` or `prod_` prefixes
- Test keys expire after 2 hours

### Database Collections
- `projects` - User and team projects
- `users` - User profiles and settings
- `keys` - API keys with metadata
- `events` - Raw console.text() logs
- `alerts` - Triggered alert records
- `config` - Per-project rules and global settings

### Core Features
1. **SDK Integration**: Node module enhances console with multiple methods:
   - `console.text()` - Primary alerting method
   - `console.call()` - Track function calls
   - `console.callText()` - Combine call tracking with alerts
   - `console.log/warn/error` - Capture standard console methods
2. **Alert Management**: Threshold-based alerting with time windows
3. **Environment Separation**: Test vs Production via API keys
4. **Team Collaboration**: Simple invite flow for team projects
5. **Dashboard**: Log viewing, threshold configuration, manual test alerts
6. **Sandbox**: Test logging directly from dashboard

## Development Guidelines

### API Development
- All server-side APIs must use Firebase Admin SDK
- Validate Bearer tokens (check for `test_` or `prod_` prefix)
- Test keys: No rate limits or origin checks
- Prod keys: Apply rate limits, origin checks, and IP validation

### Frontend Development
- Use Once UI components exclusively
- Client-side code must use Firebase Client SDK
- Auth via Google + GitHub OAuth
- **IMPORTANT**: Always use `onAuthStateChanged` listener when loading data that requires authentication
  - Don't rely on `auth.currentUser` being immediately available on page load
  - Wait for auth state to be confirmed before making authenticated API calls
  - Example pattern:
    ```typescript
    useEffect(() => {
      const auth = getAuth();
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          // Now safe to load authenticated data
          loadData();
        }
      });
      return () => unsubscribe();
    }, []);
    ```

### Current Implementation Status
✅ Basic API structure created
✅ POST `/api/v1/log` endpoint with token validation
✅ Firebase integration complete
✅ TypeScript types for all database models
✅ API key validation with Firestore
✅ Event storage in Firestore
✅ Landing page with Raycast-inspired design
✅ Navbar component
✅ Authentication setup complete (Google + GitHub OAuth)
✅ Onboarding flow with project creation and team invites
✅ Dashboard overview with real-time stats
✅ API key management (create, delete, regenerate)
✅ Event logs viewer with filtering and search
✅ Sandbox for testing logs directly from dashboard
✅ Support for multiple console methods (text, call, callText, log, warn, error)
✅ Pagination for event logs
✅ Alert configuration UI and API
⏳ Alert triggering logic and SMS integration pending
⏳ Team management page pending

## Testing Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run linter
```

## Important Notes
- The npm package for `console.text()` is maintained separately
- This repository handles the backend API and web dashboard only
- Always validate API keys before processing requests
- All database writes go through server-side APIs for security
- Users are tracked in both `projectIds` array and project `memberIds` array

## API Endpoints

### Authentication & Users
- POST `/api/auth/sync-user` - Sync user after OAuth login
- PATCH `/api/v1/users/update` - Update user profile
- POST `/api/v1/users/complete-onboarding` - Mark onboarding complete

### Projects
- POST `/api/v1/projects/create` - Create new project with initial API keys

### API Keys
- GET `/api/v1/keys` - List all keys for user's project
- POST `/api/v1/keys` - Create new API key
- DELETE `/api/v1/keys/[id]` - Delete (deactivate) an API key
- POST `/api/v1/keys/[id]/regenerate` - Regenerate an API key

### Invites
- POST `/api/v1/invites/create` - Create and send team invite
- GET `/api/v1/invites/[id]` - Get invite details
- POST `/api/v1/invites/[id]/accept` - Accept team invite
- POST `/api/v1/invites/[id]/decline` - Decline team invite

### Dashboard
- GET `/api/v1/dashboard/stats` - Get dashboard statistics

### Logging
- POST `/api/v1/log` - Log an event (supports all console methods)
- GET `/api/v1/events` - List events with filtering and pagination
- POST `/api/v1/sandbox/log` - Send test logs from dashboard sandbox

### Alerts
- GET `/api/v1/alerts/config` - Get alert configuration for project
- PATCH `/api/v1/alerts/config` - Update alert configuration

## Alerts System Requirements

### Overview
The alerts system should trigger notifications when certain thresholds are met (e.g., X events in Y minutes). It will use SMS as the primary notification method with potential phone call escalation.

### Core Components Needed

#### 1. Alert Configuration UI (`/dashboard/alerts`)
- **Threshold Settings**
  - Events count threshold (e.g., 5 events)
  - Time window in minutes (e.g., within 10 minutes)
  - Enable/disable alerts per project
  - Alert cooldown period to prevent spam
- **Contact Management**
  - Add/remove phone numbers for SMS
  - Set primary contact
  - Phone number verification flow
- **Alert Testing**
  - "Send Test Alert" button
  - Preview alert message format
- **Alert Rules**
  - Filter by log type (only errors, only prod keys, etc.)
  - Custom alert messages per rule
  - Multiple rules per project

#### 2. Backend Alert Processing
- **Real-time Event Monitoring**
  - Check thresholds on each new event logged
  - Use Firestore queries to count events in time window
  - Batch check for efficiency
- **Alert Triggering Logic**
  - Create alert record when threshold met
  - Respect cooldown periods
  - Queue SMS sending
- **SMS Integration**
  - Use Twilio or SendGrid SMS API
  - Format messages with project name, event count, time window
  - Include dashboard link for quick access
  - Handle delivery failures gracefully

#### 3. API Endpoints Needed
- `GET /api/v1/alerts/config` - Get alert configuration for project
- `PATCH /api/v1/alerts/config` - Update alert configuration
- `POST /api/v1/alerts/test` - Send test alert (pending)
- `GET /api/v1/alerts/history` - Get alert history (pending)
- `POST /api/v1/alerts/verify-phone` - Start phone verification (pending)
- `POST /api/v1/alerts/confirm-phone` - Confirm phone with code (pending)

#### 4. Database Schema Updates
- **Updated Alert System Types**:
  - Message-based grouping for alerts
  - Global limits (e.g., "at most one text per hour")
  - Message-specific limits with log type filtering
  - Text → Call escalation for callText events
  - Acknowledgment tracking

- **Key Types Added**:
  ```typescript
  type NotificationType = 'text' | 'call';
  
  interface GlobalAlertLimit {
    maxAlerts: number;
    windowMinutes: number;
  }
  
  interface MessageAlertRule {
    message: string;
    logTypes?: LogType[];
    maxAlerts: number;
    windowMinutes: number;
  }
  
  interface AlertRule {
    id: string;
    name: string;
    enabled: boolean;
    notificationType: NotificationType;
    threshold: { count: number; windowMinutes: number; };
    globalLimit?: GlobalAlertLimit;
    messageRules?: MessageAlertRule[];
    escalation?: { waitMinutes: number; };
  }
  ```
- **PhoneVerification** collection:
  ```typescript
  interface PhoneVerification {
    id: string;
    userId: string;
    phoneNumber: string;
    code: string;
    expiresAt: Date;
    verified: boolean;
  }
  ```

#### 5. Alert Processing Flow
1. New event logged via `/api/v1/log`
2. Check if project has alerts enabled
3. Query recent events matching each rule's filters
4. If threshold met and not in cooldown:
   - Create alert record
   - Send SMS via Twilio/SendGrid
   - Update lastAlertAt timestamp
5. Log alert status (sent/failed)

#### 6. UI/UX Considerations
- Clear visual indicators for alert status
- Easy toggle to pause all alerts
- Alert history with filters
- Mobile-friendly alert management
- Real-time alert status updates

### Implementation Priority
1. Alert configuration API and UI
2. Phone verification flow
3. Basic threshold checking on event creation
4. SMS integration with test mode
5. Alert history and analytics
6. Advanced filtering and rules
7. Phone call escalation (future)