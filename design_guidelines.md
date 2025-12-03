# Design Guidelines: Facial Recognition Attendance System

## Architecture Decisions

### Authentication
**No Authentication Required**
- Single-user, local-only application for administrators
- All data stored locally in SQLite
- Include a **Settings screen** with:
  - Admin display name field
  - App preferences (theme toggle, attendance notification sounds)
  - Database backup/restore options
  - About section with app version

### Navigation Structure
**Tab Navigation (3 tabs)**
- **Students Tab**: List of all registered students with management capabilities
- **Attendance Tab** (Center): Primary action - start attendance session with floating camera button
- **Reports Tab**: View attendance history and analytics

Secondary screens (accessed via stack navigation):
- Add/Edit Student (modal)
- Enroll Face (full screen with camera)
- Attendance Scanner (full screen with camera)
- Session Details (pushed from Reports)

### Screen Specifications

#### 1. Students List Screen
- **Purpose**: View and manage all registered students
- **Layout**:
  - Header: Transparent, title "Students", right button: "+" (Add Student)
  - Main content: ScrollView with search bar at top
  - Safe area insets: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Components**:
  - Search bar (fixed below header)
  - Student cards in a list format showing:
    - Student avatar (generated preset or camera icon if no face enrolled)
    - Name and Student ID
    - Face enrollment status indicator (checkmark icon if enrolled, camera icon if not)
    - Tap card to view details, swipe for delete
  - Empty state: "No students yet" with illustration and "Add Student" button

#### 2. Add/Edit Student Screen (Modal)
- **Purpose**: Capture student basic information
- **Layout**:
  - Header: Non-transparent, title "Add Student" or "Edit Student", left: "Cancel", right: "Save"
  - Main content: Scrollable form
  - Safe area insets: top = Spacing.xl, bottom = insets.bottom + Spacing.xl
- **Components**:
  - Form fields: Name (required), Student ID (required, unique)
  - Submit/Cancel buttons in header (disabled state for Save until form valid)

#### 3. Student Detail Screen
- **Purpose**: View student information and manage face enrollment
- **Layout**:
  - Header: Default navigation, title = student name, right: "Edit"
  - Main content: ScrollView
  - Safe area insets: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Components**:
  - Large student avatar/photo at top
  - Student information card (ID, enrollment date)
  - Face enrollment section:
    - If not enrolled: Large "Enroll Face" button with camera icon
    - If enrolled: Face preview thumbnail, "Re-enroll Face" button, enrollment date
  - Attendance summary card (total sessions attended, percentage)
  - Delete student button (at bottom, destructive style with confirmation alert)

#### 4. Enroll Face Screen
- **Purpose**: Capture student's face for enrollment
- **Layout**:
  - Full-screen camera view
  - Transparent overlays
  - Safe area insets: All edges = insets + Spacing.md
- **Components**:
  - Live camera preview (full screen)
  - Face detection overlay: Rounded rectangle guide with corner markers
  - Top bar: Student name, close button (left)
  - Status text (centered, above guide): "Position face within frame" / "Hold still..." / "Face detected!"
  - Bottom instruction card: Brief enrollment tips
  - Capture happens automatically when face is detected and held steady (2 seconds)
  - Success feedback: Green checkmark animation, haptic feedback
  - Failure feedback: Red shake animation with error message

#### 5. Attendance Tab (Home)
- **Purpose**: Start new attendance session
- **Layout**:
  - Header: Transparent, title "Attendance"
  - Main content: Centered content with stats
  - Floating Action Button: Large camera button (center bottom)
  - Safe area insets: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl + 80 (for FAB)
- **Components**:
  - Session info card: Today's date, quick stats (students enrolled, attendance taken today)
  - Floating camera button with drop shadow:
    - shadowOffset: {width: 0, height: 2}
    - shadowOpacity: 0.10
    - shadowRadius: 2
  - Recent attendance list (last 5 records with names and timestamps)

#### 6. Attendance Scanner Screen
- **Purpose**: Live facial recognition and attendance marking
- **Layout**:
  - Full-screen camera view
  - Transparent overlays
  - Safe area insets: All edges = insets + Spacing.md
- **Components**:
  - Live camera preview (full screen)
  - Face detection box (animated when scanning)
  - Top bar: Session time, close button (left), student count (right)
  - Recognition feedback overlay (bottom sheet):
    - When face detected: Student name appears with slide-up animation
    - Success state: Green checkmark, student name, "Marked Present"
    - Already marked: Yellow warning icon, "Already marked for this session"
    - Unknown face: Red X, "Face not recognized"
  - Attendance count badge (floating, top right): "12/30 Present"
  - Auto-dismissing toast notifications for each successful mark

#### 7. Reports Tab
- **Purpose**: View attendance history and analytics
- **Layout**:
  - Header: Transparent, title "Reports"
  - Main content: ScrollView with date filter at top
  - Safe area insets: top = headerHeight + Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Components**:
  - Date range picker (This Week, This Month, Custom)
  - Overall statistics cards: Total sessions, average attendance rate
  - Session list: Cards showing date, time, student count, tap to view details
  - Empty state: "No attendance records yet"

#### 8. Session Details Screen
- **Purpose**: View attendance for a specific session
- **Layout**:
  - Header: Default navigation, title = session date/time
  - Main content: List
  - Safe area insets: top = Spacing.xl, bottom = tabBarHeight + Spacing.xl
- **Components**:
  - Session summary header: Date, time, attendance count
  - List of present students with timestamps
  - Absent students section (collapsible, grayed out)
  - Export button (bottom): Share session data

## Design System

### Color Palette
**Primary Colors**:
- Primary: #2563EB (Blue - professional, trustworthy)
- Primary Dark: #1E40AF
- Success: #10B981 (Green - successful recognition)
- Warning: #F59E0B (Yellow - already marked)
- Error: #EF4444 (Red - recognition failed)
- Background: #F9FAFB (Light gray)
- Surface: #FFFFFF

**Text Colors**:
- Text Primary: #111827
- Text Secondary: #6B7280
- Text Disabled: #9CA3AF

### Typography
- Header Large: 28pt, Bold
- Header Medium: 20pt, Semibold
- Body: 16pt, Regular
- Caption: 14pt, Regular
- Button Text: 16pt, Semibold

### Spacing Scale
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px

### Component Guidelines

**Student Cards**:
- White background with subtle border
- 16px padding
- 8px border radius
- Avatar: 48x48px circle
- Press state: Scale down to 0.98, slight shadow

**Camera Overlays**:
- Semi-transparent dark background (rgba(0,0,0,0.4))
- Face detection guide: White stroke, 4px width, rounded corners
- Animated pulse effect when detecting

**Floating Action Button**:
- 64x64px circle
- Primary color background
- White camera icon (Feather: camera)
- Exact shadow specifications:
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- Press state: Scale to 0.95

**Status Indicators**:
- Enrolled: Green checkmark icon (Feather: check-circle)
- Not enrolled: Gray camera icon (Feather: camera)
- Present: Green dot
- Absent: Gray dot

**Forms**:
- Input fields: 48px height, rounded corners, border on focus
- Labels above inputs
- Validation errors below inputs in red text

### Visual Feedback
- All buttons scale to 0.95 on press
- Recognition success: Green flash + haptic feedback
- Recognition failure: Red shake animation + error haptic
- Loading states: Spinner overlay during face processing

### Accessibility Requirements
- All interactive elements minimum 44x44pt touch target
- Color contrast ratio minimum 4.5:1
- Camera permissions prompt with clear explanation
- VoiceOver labels for all icons and images
- Error messages must be announced
- Alternative to facial recognition: Manual attendance marking option in overflow menu

### Critical Assets
**Generated Assets** (3 preset student avatars):
1. Avatar 1: Geometric academic cap icon in primary color
2. Avatar 2: Abstract book icon in secondary color  
3. Avatar 3: Simple person silhouette in tertiary color
- Style: Minimalist, flat design, professional academic theme

**System Icons** (Feather icons from @expo/vector-icons):
- camera, check-circle, x-circle, alert-circle, edit-2, trash-2, users, calendar, clock, download