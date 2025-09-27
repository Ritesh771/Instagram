# React Pics Share - Mobile App

A React Native Expo mobile application for sharing photos with a beautiful, Instagram-like interface. This app replicates the functionality of the web version with mobile-first design principles.

## Features

- 📱 **Mobile-First Design**: Optimized for mobile devices with touch-friendly interfaces
- 🔐 **Authentication**: Complete auth system with login, register, 2FA, and password reset
- 📸 **Photo Sharing**: Upload photos from camera or gallery with captions
- 🏠 **Feed**: Browse posts from all users in a beautiful feed
- 👤 **Profile Management**: View and edit your profile, bio, and settings
- 🔒 **Secure Storage**: Uses Expo SecureStore for secure token management
- 🎨 **Beautiful UI**: Gradient designs and smooth animations
- 📱 **Cross-Platform**: Works on both iOS and Android

## Tech Stack

- **React Native** with Expo SDK 50
- **TypeScript** for type safety
- **React Navigation** for navigation
- **Expo SecureStore** for secure token storage
- **Expo Image Picker** for photo selection
- **Expo Camera** for taking photos
- **Expo Linear Gradient** for beautiful gradients
- **React Query** for data fetching and caching
- **Axios** for API communication

## Project Structure

```
expogo/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── PostCard.tsx
│   │   └── LoadingSpinner.tsx
│   ├── context/            # React Context providers
│   │   ├── AuthContext.tsx
│   │   └── PostsContext.tsx
│   ├── navigation/         # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── screens/            # Screen components
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ForgotPasswordScreen.tsx
│   │   ├── ResetPasswordScreen.tsx
│   │   ├── FeedScreen.tsx
│   │   ├── UploadScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── services/           # API services
│   │   └── api.ts
│   └── types/              # TypeScript type definitions
├── assets/                 # App assets (icons, images)
├── App.tsx                 # Main app component
├── app.json               # Expo configuration
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Installation

1. **Prerequisites**:
   - Node.js (v16 or later)
   - npm or yarn
   - Expo CLI: `npm install -g @expo/cli`
   - Expo Go app on your mobile device

2. **Install Dependencies**:
   ```bash
   cd expogo
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm start
   ```

4. **Run on Device**:
   - Install Expo Go app on your phone
   - Scan the QR code from the terminal
   - The app will load on your device

## API Configuration

The app connects to the same Django backend as the web version. Make sure your backend is running on `http://localhost:8000`.

To change the API URL, update the `API_BASE_URL` in `src/services/api.ts`:

```typescript
const API_BASE_URL = 'http://your-backend-url:8000/api';
```

## Mobile-Specific Features

### Image Handling
- **Camera Access**: Take photos directly in the app
- **Gallery Selection**: Choose photos from your device's gallery
- **Image Optimization**: Automatic image compression and resizing
- **Square Aspect Ratio**: Images are automatically cropped to 1:1 ratio

### Secure Storage
- **Token Management**: Uses Expo SecureStore for secure token storage
- **Automatic Refresh**: Handles token refresh automatically
- **Secure Logout**: Properly clears all stored data

### Mobile UI/UX
- **Touch-Friendly**: Large buttons and touch targets
- **Gesture Support**: Pull-to-refresh on feed
- **Keyboard Handling**: Proper keyboard avoidance
- **Loading States**: Beautiful loading indicators
- **Error Handling**: User-friendly error messages

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser

## Key Differences from Web Version

1. **Navigation**: Uses React Navigation instead of React Router
2. **Storage**: Uses Expo SecureStore instead of localStorage
3. **Image Picker**: Native image selection with camera support
4. **UI Components**: Custom React Native components instead of web components
5. **Styling**: StyleSheet instead of CSS/Tailwind
6. **Platform-Specific**: Handles iOS and Android differences

## Authentication Flow

1. **Login**: Username/password with optional 2FA
2. **Register**: Email verification required
3. **Password Reset**: Email-based reset with verification code
4. **Secure Storage**: Tokens stored securely on device
5. **Auto Refresh**: Automatic token refresh handling

## Post Management

1. **Upload**: Select image from camera or gallery
2. **Caption**: Add text description
3. **Feed**: View all posts with pull-to-refresh
4. **Delete**: Delete your own posts
5. **Profile**: View your posts in profile

## Development Notes

- **TypeScript**: Full type safety throughout the app
- **Error Handling**: Comprehensive error handling and user feedback
- **Loading States**: Proper loading indicators for all async operations
- **Responsive Design**: Adapts to different screen sizes
- **Accessibility**: Proper accessibility labels and support

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **Permission errors**: Make sure camera/photo permissions are granted
3. **API connection**: Verify backend is running and accessible
4. **Build issues**: Check Expo SDK version compatibility

### Debug Mode

Enable debug mode by shaking your device or pressing `Cmd+D` (iOS) / `Cmd+M` (Android) to open the developer menu.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on both iOS and Android
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please open an issue in the repository or contact the development team.
