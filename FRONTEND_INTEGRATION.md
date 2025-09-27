# Frontend Integration with Django Backend

This document outlines the complete frontend integration with the Django backend API for the React Pics Share application.

## 🚀 Features Implemented

### Authentication System
- **User Registration** with email verification
- **Login** with username/password
- **2FA Support** for enhanced security
- **Password Reset** via email OTP
- **JWT Token Management** with automatic refresh
- **Protected Routes** with authentication checks

### Post Management
- **Create Posts** with image upload and captions
- **View Posts** in a dynamic feed
- **Delete Posts** (own posts only)
- **Real-time Updates** when posts are added/removed
- **Image Handling** with proper URL construction

### User Interface
- **Responsive Design** with mobile-first approach
- **Loading States** for all async operations
- **Error Handling** with user-friendly messages
- **Toast Notifications** for user feedback
- **Modern UI** with shadcn/ui components

## 📁 File Structure

```
src/
├── services/
│   └── api.ts                 # API service layer
├── context/
│   ├── AuthContext.tsx        # Authentication context
│   └── PostsContext.tsx       # Posts management context
├── pages/
│   ├── Login.tsx              # Login page with 2FA
│   ├── Register.tsx           # Registration with OTP
│   ├── ForgotPassword.tsx     # Password reset request
│   ├── ResetPassword.tsx      # Password reset confirmation
│   ├── Feed.tsx               # Main feed page
│   ├── Upload.tsx             # Post creation page
│   └── Profile.tsx            # User profile page
├── components/
│   ├── PostCard.tsx           # Individual post component
│   ├── UploadForm.tsx         # Post upload form
│   ├── Navbar.tsx             # Navigation bar
│   ├── ProtectedRoute.tsx     # Route protection
│   └── LoadingSpinner.tsx     # Loading component
└── App.tsx                    # Main app component
```

## 🔧 API Integration

### Base Configuration
- **Base URL**: `http://localhost:8000/api`
- **Authentication**: JWT Bearer tokens
- **File Upload**: Multipart form data
- **Error Handling**: Comprehensive error management

### Endpoints Used
- `POST /auth/register/` - User registration
- `POST /auth/verify-otp/` - Email verification
- `POST /auth/login/` - User login
- `POST /auth/verify-2fa/` - 2FA verification
- `POST /auth/reset-password/` - Password reset request
- `POST /auth/reset-password/confirm/` - Password reset confirmation
- `POST /auth/token/refresh/` - Token refresh
- `GET /posts/` - Get all posts
- `POST /posts/` - Create new post
- `DELETE /posts/{id}/` - Delete post

## 🎯 Key Features

### 1. Authentication Flow
```typescript
// Registration
const result = await register(username, email, password);
if (result.success) {
  // Show OTP verification step
  await verifyOTP(email, code);
}

// Login with 2FA support
const result = await login(username, password);
if (result.requires2FA) {
  // Show 2FA verification step
  await verify2FA(username, code);
}
```

### 2. Post Management
```typescript
// Create post with image upload
const formData = new FormData();
formData.append('image', imageFile);
formData.append('caption', caption);
const result = await addPost(imageFile, caption);

// Delete post (owner only)
const result = await deletePost(postId);
```

### 3. Image Handling
```typescript
// Proper image URL construction
const getImageUrl = (imagePath: string) => {
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  return `http://localhost:8000${imagePath}`;
};
```

## 🔒 Security Features

- **JWT Token Management**: Automatic refresh and secure storage
- **Route Protection**: Authentication required for protected routes
- **File Validation**: Image type and size validation
- **Error Boundaries**: Graceful error handling
- **Input Validation**: Form validation with proper error messages

## 🎨 UI/UX Features

- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: User-friendly error messages
- **Toast Notifications**: Success and error feedback
- **Responsive Design**: Mobile-first approach
- **Modern Components**: shadcn/ui component library

## 🚀 Getting Started

1. **Install Dependencies**:
   ```bash
   npm install axios @types/axios
   ```

2. **Start Backend**:
   ```bash
   cd backend
   python manage.py runserver
   ```

3. **Start Frontend**:
   ```bash
   npm run dev
   ```

4. **Access Application**:
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:8000/api`

## 📝 Usage Examples

### Register a New User
1. Navigate to `/register`
2. Fill in username, email, and password
3. Check email for verification code
4. Enter OTP to verify account
5. Redirected to feed

### Create a Post
1. Navigate to `/upload`
2. Select an image file
3. Add a caption
4. Click "Share Post"
5. Post appears in feed

### View Profile
1. Click on username in any post
2. View user's posts grid
3. See post statistics

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:
```
VITE_API_BASE_URL=http://localhost:8000/api
```

### API Service Configuration
The API service automatically handles:
- Token attachment to requests
- Token refresh on 401 errors
- Error formatting and handling
- Request/response interceptors

## 🐛 Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure backend CORS is configured
2. **Token Expired**: Tokens are automatically refreshed
3. **Image Upload Fails**: Check file size and type
4. **Network Errors**: Verify backend is running

### Debug Mode
Enable debug logging in the API service:
```typescript
// In api.ts
console.log('API Request:', config);
console.log('API Response:', response);
```

## 📈 Performance Optimizations

- **Lazy Loading**: Components loaded on demand
- **Image Optimization**: Proper image URL handling
- **Token Caching**: Efficient token storage
- **Error Boundaries**: Prevent app crashes
- **Loading States**: Better user experience

## 🔄 State Management

- **AuthContext**: User authentication state
- **PostsContext**: Posts data and operations
- **Local Storage**: Token persistence
- **React Query**: Data fetching and caching

This integration provides a complete, production-ready frontend that seamlessly works with the Django backend API.
