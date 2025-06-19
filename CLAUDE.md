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
1. **SDK Integration**: Node module adds `console.text()` to global console
2. **Alert Management**: Threshold-based alerting with time windows
3. **Environment Separation**: Test vs Production via API keys
4. **Team Collaboration**: Simple invite flow for team projects
5. **Dashboard**: Log viewing, threshold configuration, manual test alerts

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

### Current Implementation Status
✅ Basic API structure created
✅ POST `/api/v1/log` endpoint with token validation
✅ Firebase integration complete
✅ TypeScript types for all database models
✅ API key validation with Firestore
✅ Event storage in Firestore
✅ Landing page with Raycast-inspired design
✅ Navbar component
⏳ Authentication setup pending
⏳ Dashboard UI pending
⏳ Alert triggering logic pending

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
- Log events to console for now, Firebase integration coming next