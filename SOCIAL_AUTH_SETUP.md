# Social Auth Setup Guide

## 📋 المتطلبات

### 1️⃣ Google OAuth Setup

1. اذهب إلى [Google Cloud Console](https://console.cloud.google.com/)
2. أنشئ مشروع جديد أو اختر مشروع موجود
3. فعّل Google+ API
4. اذهب إلى "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. اختر "Web application"
6. أضف `http://localhost:3000` في "Authorized JavaScript origins"
7. انسخ الـ Client ID

### 2️⃣ Facebook OAuth Setup

1. اذهب إلى [Facebook Developers](https://developers.facebook.com/)
2. أنشئ تطبيق جديد
3. أضف "Facebook Login" product
4. في Settings → Basic، أضف `http://localhost:3000` في "App Domains"
5. في Facebook Login → Settings، أضف `http://localhost:3000` في "Valid OAuth Redirect URIs"
6. انسخ الـ App ID

### 3️⃣ Apple OAuth Setup

1. اذهب إلى [Apple Developer Console](https://developer.apple.com/)
2. أنشئ App ID جديد
3. فعّل "Sign In with Apple" capability
4. أنشئ Service ID
5. أضف domain و redirect URL
6. انسخ الـ Client ID

## 🔧 Environment Variables

أنشئ ملف `.env` في جذر المشروع وأضف:

```env
# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id_here

# Facebook OAuth
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id_here

# Apple OAuth
REACT_APP_APPLE_CLIENT_ID=your_apple_client_id_here

# API Base URL
REACT_APP_API_URL=http://localhost:5000/api
```

### Google Login
```
POST /api/auth/google
Body: { "token": "google_access_token" }
Response: { "success": true, "user": {...}, "token": "jwt_token" }
```

### Facebook Login
```
POST /api/auth/facebook
Body: { "accessToken": "facebook_access_token" }
Response: { "success": true, "user": {...}, "token": "jwt_token" }
```

### Apple Login
```
POST /api/auth/apple
Body: { "identityToken": "apple_id_token", "authorizationCode": "apple_auth_code" }
Response: { "success": true, "user": {...}, "token": "jwt_token" }
