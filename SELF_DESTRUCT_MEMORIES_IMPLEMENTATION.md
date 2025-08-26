# Self-Destruct Memories Feature Implementation

## Overview
The self-destruct memories feature allows users to set automatic deletion timers on their memories. Memories will be permanently deleted when the timer expires, providing enhanced privacy and data management capabilities.

## Features Implemented

### 1. Database Schema Updates
- **Migration**: `20250820120000_add_memory_expiration.sql`
- **New Columns**:
  - `expires_at`: Timestamp when the memory should be deleted
  - `auto_delete_enabled`: Boolean flag to enable/disable auto-deletion
- **Database Functions**:
  - `cleanup_expired_memories()`: Removes expired memories
  - `set_memory_expiration()`: Sets expiration for a specific memory

### 2. Core Services

#### MemoryExpirationService
- **Location**: `src/services/memoryExpirationService.ts`
- **Features**:
  - Set memory expiration with preset or custom durations
  - Automatic cleanup of expired memories every 5 minutes
  - Time remaining calculations and status checks
  - Expiration presets (1 hour to 1 year)

### 3. UI Components

#### MemoryExpirationModal
- **Location**: `src/components/MemoryExpirationModal.tsx`
- **Features**:
  - Preset expiration options (1 hour, 1 day, 1 week, etc.)
  - Custom duration input
  - Current expiration status display
  - Warning about permanent deletion

#### MemoryExpirationBadge
- **Location**: `src/components/MemoryExpirationBadge.tsx`
- **Features**:
  - Visual indicator for memories with expiration timers
  - Color-coded urgency (red for expired, orange for urgent, yellow for normal)
  - Time remaining display

### 4. Integration Points

#### Memory Store Updates
- Added expiration service lifecycle management
- Automatic cleanup service starts/stops with the app
- Updated memory type to include expiration fields

#### UI Integration
- **Memories Page**: Clock button on each memory card to set timers
- **Search Results**: Expiration badges on memory results
- **Dashboard**: Expiration badges on recent memories

## Usage

### Setting Expiration Timer
1. Click the clock icon on any memory card
2. Choose from preset durations or enter custom hours
3. Confirm to set the timer
4. Memory will show expiration badge with time remaining

### Expiration Presets
- 1 Hour, 6 Hours
- 1 Day, 3 Days
- 1 Week, 1 Month
- 3 Months, 6 Months, 1 Year
- Custom duration in hours

### Visual Indicators
- **Yellow Badge**: Normal expiration (more than 1 hour remaining)
- **Orange Badge**: Urgent expiration (less than 1 hour remaining)
- **Red Badge**: Expired (will be deleted on next cleanup)

## Technical Details

### Automatic Cleanup
- Runs every 5 minutes in the background
- Only deletes memories where `auto_delete_enabled = true`
- Logs cleanup activities for audit purposes

### Security
- Users can only set expiration on their own memories
- RLS policies maintain data isolation
- Cleanup function runs with elevated privileges but respects user boundaries

### Performance
- Indexed `expires_at` column for efficient cleanup queries
- Minimal impact on existing functionality
- Background cleanup doesn't affect user experience

## Database Migration
To enable this feature, run the migration:
```sql
-- Apply the migration in Supabase SQL Editor
-- File: supabase/migrations/20250820120000_add_memory_expiration.sql
```

## Future Enhancements
- Email notifications before expiration
- Bulk expiration setting for multiple memories
- Expiration templates for different memory types
- Recovery period before permanent deletion
- Statistics on expired memories