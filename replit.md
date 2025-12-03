# FaceAttend - Facial Recognition Attendance System

## Overview
A React Native/Expo mobile application for managing student attendance through facial recognition. The app allows administrators to manage students, enroll their faces via camera, and mark attendance through live facial recognition scanning.

## Current State
**Status**: Fully functional MVP prototype with persistent storage

## Technology Stack
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation 7+ with bottom tabs and stack navigators
- **State Management**: React Context API with AsyncStorage for persistence
- **Camera**: expo-camera for face enrollment and scanning
- **Animations**: react-native-reanimated for smooth animations
- **Styling**: iOS-style design with professional blue theme (#2563EB)

## Key Features
1. **Student Management** (Students Tab)
   - View all students in a list
   - Add new students with name and unique ID
   - Edit student information
   - Delete students with confirmation
   - Face enrollment status indicator

2. **Face Enrollment**
   - Camera-based face capture for each student
   - Visual guide frame for positioning
   - Success feedback with haptics (on native)
   - Web fallback directing users to Expo Go

3. **Attendance Sessions** (Attendance Tab)
   - Start new attendance sessions
   - Real-time face scanning with camera
   - Automatic duplicate prevention
   - Session timer and progress tracking
   - Visual feedback for recognized faces

4. **Reports** (Reports Tab)
   - Today's attendance summary
   - Historical session list
   - Session detail view with attendee list
   - Attendance statistics per student

## Data Persistence
- All data is stored on-device using AsyncStorage
- Data persists across app restarts
- Storage keys:
  - `@faceattend_students`: Student records
  - `@faceattend_sessions`: Attendance sessions

## Project Structure
```
├── App.tsx                          # App entry with providers
├── app.json                         # Expo configuration
├── store/
│   └── AppContext.tsx               # Global state with AsyncStorage
├── navigation/
│   ├── MainTabNavigator.tsx         # Bottom tab navigation
│   ├── StudentsStackNavigator.tsx   # Students stack
│   ├── AttendanceStackNavigator.tsx # Attendance stack
│   └── ReportsStackNavigator.tsx    # Reports stack
├── screens/
│   ├── StudentsListScreen.tsx       # Student list
│   ├── StudentDetailScreen.tsx      # Student details
│   ├── AddEditStudentScreen.tsx     # Add/edit student
│   ├── EnrollFaceScreen.tsx         # Face enrollment
│   ├── AttendanceHomeScreen.tsx     # Attendance dashboard
│   ├── AttendanceScannerScreen.tsx  # Live face scanning
│   ├── ReportsScreen.tsx            # Reports overview
│   └── SessionDetailScreen.tsx      # Session details
├── components/                       # Reusable UI components
└── constants/
    └── theme.ts                      # Design tokens
```

## Design System
- **Primary Color**: Blue (#2563EB)
- **Success**: Green (#10B981)
- **Warning**: Orange (#F59E0B)
- **Error**: Red (#EF4444)
- **Border Radius**: 8px (md), 12px (lg), 16px (xl)
- **Spacing Scale**: 4, 8, 12, 16, 20, 24, 32, 48

## Important Notes
1. **Simulated Recognition**: Face recognition is currently simulated. Real ML-based recognition would require a development build and additional libraries not compatible with Expo Go.

2. **Camera Features**: Camera functionality (face enrollment, scanning) works on native devices via Expo Go. The web version shows a fallback directing users to use Expo Go.

3. **No Backend**: This is a pure frontend app - no server or external database. All data is stored locally on the device.

## Running the App
- **Web**: View in browser (limited camera support)
- **Mobile**: Scan QR code with Expo Go app for full native features

## Recent Changes
- Added AsyncStorage for persistent data storage
- Functions for add/update/delete are now async
- Data survives app restarts

## User Preferences
- Professional blue color scheme
- iOS-inspired liquid glass design
- Clean, minimal interface
