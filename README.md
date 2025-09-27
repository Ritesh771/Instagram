# React Pics Share

A full-stack social media application for sharing pictures, similar to Instagram. The project consists of a React-based web frontend, a Django REST API backend, and a React Native mobile app built with Expo.

## Features

- User registration and authentication (including 2FA and biometric login)
- Picture upload and sharing
- Like/unlike posts
- User profiles with bio and profile pictures
- Password reset functionality
- Responsive web interface
- Mobile app for iOS and Android

## Developers

- **Major Developer**: Ritesh N
- **Minor Developer**: Pannaga

## Project Structure

- `backend/` - Django REST API server
- `src/` - React web frontend
- `expogo/` - React Native mobile app (Expo)
- `public/` - Static assets for frontend

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- Bun (recommended for package management)
- Expo CLI (for mobile app)

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment and install dependencies:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. Create environment file:
   ```
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run migrations and create superuser:
   ```
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. Start the backend server:
   ```
   python manage.py runserver 0.0.0.0:8000
   ```

### Frontend Setup

1. Navigate to the root directory (contains the React app):
   ```
   cd /path/to/react-pics-share
   ```

2. Install dependencies:
   ```
   bun install
   ```

3. Start the development server:
   ```
   bun run dev
   ```

### Mobile App (Expogo) Setup

1. Navigate to the expogo directory:
   ```
   cd expogo
   ```

2. Install dependencies:
   ```
   bun install
   ```

3. Update the API base URL in `src/services/api.ts`:
   - Change `API_BASE_URL` to your local IP (e.g., `http://192.168.1.100:8000/api`)
   - Find your local IP using `ifconfig` (macOS/Linux) or `ipconfig` (Windows)

4. Start the Expo development server:
   ```
   npx expo start --clear
   ```

   For specific platforms:
   - iOS: `npx expo start --ios`
   - Android: `npx expo start --android`

### API Endpoints

- POST `/api/auth/register/` - User registration
- POST `/api/auth/verify-otp/` - OTP verification
- POST `/api/auth/login/` - User login (JWT)
- POST `/api/auth/reset-password/` - Request password reset
- POST `/api/auth/reset-password/confirm/` - Confirm password reset
- GET/POST `/api/posts/` - Get/create posts
- DELETE `/api/posts/{id}/` - Delete post
- POST `/api/posts/{id}/like/` - Like a post
- DELETE `/api/posts/{id}/like/` - Unlike a post

Images are served at `/media/` during development.

## Technologies Used

- **Backend**: Django, Django REST Framework, SQLite
- **Frontend**: React, TypeScript, Tailwind CSS, Vite
- **Mobile**: React Native, Expo
- **Authentication**: JWT, 2FA, Biometric authentication