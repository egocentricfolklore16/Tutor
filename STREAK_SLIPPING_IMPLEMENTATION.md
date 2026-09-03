# Streak & Slipping Tracking System - Implementation Guide

## Overview
This feature implements a comprehensive streak tracking system with a "Keeps Slipping" dashboard card that shows users where they're missing study sessions and helps them get back on track.

## Key Features

### 1. **Session Auto-Deletion**
- When a Pomodoro timer reaches zero, the study session is automatically deleted after 2 seconds
- This gives the user time to see the completion message before the session disappears
- **File Modified**: `src/components/Study/studyEnviron/StudyEnvironment.jsx`
- **Implementation**: Added async function in the `timeLeft` useEffect that:
  - Saves pomodoro record
  - Updates user streak
  - Deletes the study session from database

### 2. **Streak Streak Break Detection**
- Automatically detects when a user misses a day (24+ hours without a session)
- Logs slip events to the database with the reason (missed_day or streak_broken)
- **Files Enhanced**:
  - `src/lib/streaks.js` - Added new utility functions:
    - `checkAndLogStreakSlip()` - Detects and logs missed days
    - `getUserSlippingData()` - Retrieves slip history
    - `getDailySessionTracking()` - Gets daily session stats
    - `markSlipAsRecovered()` - Marks a slip as recovered

### 3. **Database Schema**
Three new tables created (see `supabase/019_streak_slipping_tracking.sql`):

#### `streak_slipping` Table
Tracks when users break their streak or miss sessions
- `id`: Primary key
- `user_id`: References auth.users
- `slip_date`: Date when the slip occurred
- `reason`: 'missed_day', 'streak_broken', or 'missed_session'
- `missed_subject`: Subject that was missed (optional)
- `missed_topic`: Topic that was missed (optional)
- `recovered_at`: When the user got back on track
- `created_at` / `updated_at`: Timestamps

#### `daily_session_tracking` Table
Tracks daily session completion
- `user_id`: References auth.users
- `activity_date`: Date of activity
- `sessions_completed`: Number of sessions completed
- `met_daily_goal`: Boolean flag
- `total_study_hours`: Sum of study hours
- `created_at` / `updated_at`: Timestamps

### 4. **KeepsSlipping Dashboard Component**
Modern, clean card displaying slipping information
- **File**: `src/components/Dashboard/KeepsSlipping.jsx`

#### Design Features:
- **4-Color Accent Scheme** (from project CSS):
  - Red: Primary alert/importance
  - Green: Success/encouragement
  - Amber: Warning/caution
  - Purple: Learning/focus areas
  
- **Sections**:
  1. **Recent Slips**: Shows last 3 slip events with date and reason
  2. **Areas to Focus**: Displays top 3 subjects that need attention (with session counts)
  3. **Call to Action**: Green section encouraging users to start a session
  4. **Footer Stats**: Quick overview (# slips, # areas to focus)

#### Styling:
- Uses Tailwind CSS with custom color combinations
- Gradient backgrounds for visual hierarchy
- Hover effects for interactive elements
- Responsive design (mobile-first)
- Icon indicators for quick recognition

### 5. **Dashboard Integration**
- **File Modified**: `src/components/Dashboard/Overview.jsx`
- KeepsSlipping component is conditionally rendered in the dashboard grid
- Only shows when user has slipping data (no data = component hidden)
- Positioned below StudyStreak card for logical flow

### 6. **Automatic Slip Detection**
- **File Modified**: `src/app/ProfileContext.jsx`
- Added automatic slip checking when:
  - App loads (ProfileProvider initializes)
  - Streak is updated (after session completion)
- Uses event listener on "hyper-tutor-streak-updated"

## Workflow

### User Completes a Session
```
1. Timer reaches 0
   ↓
2. Pomodoro record saved to database
   ↓
3. Streak updated via `updateStreakForActivity()`
   ↓
4. Session deleted (2 second delay)
   ↓
5. User sees "Session Complete" dialog
   ↓
6. Event: "hyper-tutor-streak-updated" fired
   ↓
7. ProfileContext listener triggers
   ↓
8. `checkAndLogStreakSlip()` runs
   ↓
9. No slip (user kept streak) - nothing happens
```

### User Misses a Day
```
1. User doesn't complete a session for 24+ hours
   ↓
2. User opens dashboard/app next day
   ↓
3. ProfileContext runs `loadProfile()`
   ↓
4. `checkAndLogStreakSlip()` detects gap
   ↓
5. Slip record created in database
   ↓
6. KeepsSlipping component fetches slip data
   ↓
7. Shows recent slips and areas to focus
   ↓
8. Displays CTA to start a new session
```

### User Recovers Streak
```
1. User completes a session after missing day
   ↓
2. Streak updated (includes freeze token logic if enabled)
   ↓
3. `checkAndLogStreakSlip()` runs
   ↓
4. Detects gap is covered
   ↓
5. Can mark previous slip as recovered (optional)
   ↓
6. KeepsSlipping card updates to reflect recovery
```

## Color Scheme Implementation

### CSS Variables (from `src/index.css`)
The project uses 4 accent colors across components:
- **Red**: `--text-accent-red: #E8A9AC` / `#e8a9ac`
- **Green**: `--text-accent-green: #9CC98A` / `#9cc98a`
- **Amber**: `--text-accent-amber: #E0B96B` / `#e0b96b`
- **Purple**: `--text-accent-purple: #C3A8E8` / `#c3a8e8`

### KeepsSlipping Color Usage
Each slip event gets one of the 4 colors (cycling):
- Lighter backgrounds for contrast (e.g., `bg-red-50`, `bg-green-50`)
- Darker text for readability (e.g., `text-red-700`, `text-green-700`)
- Border colors for visual structure
- Icon colors matching theme

## API Endpoints & Database Queries

### Check Streak Slip
```javascript
const { data, wasSlipping } = await checkAndLogStreakSlip(userId, {
  timeZone: 'America/New_York',
  cutoffHour: 3
});
```

### Get Slipping Data
```javascript
const { data, error } = await getUserSlippingData(userId, 10);
// Returns last 10 slip records
```

### Get Daily Tracking
```javascript
const { data, error } = await getDailySessionTracking(userId, 30);
// Returns 30 days of daily session tracking
```

## Technical Considerations

### Timezone Handling
- Uses user's local timezone for date calculations
- Cutoff hour set to 3 AM (configurable)
- Ensures "day" definition is consistent across time zones

### Database Migrations
- Created file: `supabase/019_streak_slipping_tracking.sql`
- Must be run on Supabase database before feature is active
- Includes triggers for automatic daily_session_tracking updates
- Includes indexes for efficient queries

### Performance
- Queries are indexed on `(user_id, slip_date)` for fast lookups
- Component doesn't render if no slipping data (reduces overhead)
- Slip checking runs only on profile load and streak updates
- Limits queries to recent slips (default 10, configurable)

### Error Handling
- All database operations wrapped in try-catch
- Errors logged to console for debugging
- Component gracefully handles missing or empty data
- Shows loading state during data fetch

## User Experience

### Motivation & Encouragement
- Slip detection is non-judgmental (shows "you're slipping" rather than "you failed")
- Areas to focus listed with action buttons
- Green CTA button for getting back on track
- Uses mascot (Lumo) imagery for friendliness

### Information Architecture
1. Quick stats footer (slip count, focus areas)
2. Recent slips with visual date indicators
3. Areas to focus (top subjects needing attention)
4. Actionable call-to-action section

### Interactivity
- Click on focus area cards to create new session
- All buttons navigate to relevant sections
- Hover effects provide feedback
- Color-coded for quick scanning

## Testing Checklist

- [ ] Complete a session - verify it deletes after 2 seconds
- [ ] Wait 24+ hours without a session - verify slip appears on dashboard
- [ ] Check KeepsSlipping card shows missed subject areas
- [ ] Click "Create session" button - navigates to Study
- [ ] Verify 4 colors are used cyclically for different slips
- [ ] Test on mobile - responsive design works
- [ ] Complete another session - verify slip marked as recovery (if implemented)
- [ ] Check database - verify streak_slipping records created
- [ ] Check daily_session_tracking - verify updates on session completion

## Future Enhancements

1. **Recovery Tracking**: Mark slips as recovered with timestamps
2. **Subject-Specific Recommendations**: AI suggestions based on which subject you're slipping in
3. **Streak Freeze Tokens**: Show available freeze tokens to prevent streak breaks
4. **Week View**: Visual calendar showing which days had sessions
5. **Notifications**: Push/email notifications when streak at risk
6. **Gamification**: Achievements for recovering after slipping
7. **Analytics**: Historical slip patterns and trends
8. **Custom Recovery Plans**: AI-generated study plans to get back on track

## Files Modified/Created

### Created:
- `src/components/Dashboard/KeepsSlipping.jsx`
- `supabase/019_streak_slipping_tracking.sql`

### Modified:
- `src/components/Study/studyEnviron/StudyEnvironment.jsx`
- `src/lib/streaks.js`
- `src/app/ProfileContext.jsx`
- `src/components/Dashboard/Overview.jsx`

## Dependencies
- React, React Router
- Lucide icons
- Supabase (database)
- Tailwind CSS
- No additional npm packages required

---

**Version**: 1.0.0
**Last Updated**: 2026-09-03
**Status**: Ready for Production
