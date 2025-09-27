# Network Setup Guide

This guide explains how to configure the mobile app to work with different networks and devices.

## 🏠 Current Setup (Home WiFi)
- **Your IP**: `192.168.0.101`
- **Backend URL**: `http://192.168.0.101:8000/api`
- **Status**: ✅ Configured

## 🔄 Switching Networks

### Method 1: Automatic IP Detection (Recommended)
```bash
# Run this script to automatically detect and update your IP
node update-network.js
```

### Method 2: Manual Configuration
Edit `src/config/network.ts` and update the `API_BASE_URL`:

```typescript
export const NETWORK_CONFIG = {
  // Update this line with your new IP
  API_BASE_URL: 'http://YOUR_NEW_IP:8000/api',
};
```

## 📱 Common Network Scenarios

### 1. Home WiFi Network
```typescript
API_BASE_URL: 'http://192.168.0.101:8000/api',
```

### 2. Mobile Hotspot
```typescript
// Usually starts with 192.168.43.x or 192.168.137.x
API_BASE_URL: 'http://192.168.43.1:8000/api',
```

### 3. Office WiFi
```typescript
// Usually starts with 192.168.1.x or 10.x.x.x
API_BASE_URL: 'http://192.168.1.100:8000/api',
```

### 4. Same Machine Testing
```typescript
API_BASE_URL: 'http://localhost:8000/api',
```

## 🔧 Backend Configuration

The Django backend is already configured to accept connections from any device:

```python
# In backend/config/settings.py
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '192.168.0.101', '0.0.0.0']
CORS_ALLOW_ALL_ORIGINS = True
```

**Start the backend with:**
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

## 📱 Mobile Device Setup

### For iOS/Android Devices:
1. Connect to the same WiFi network as your computer
2. Open Expo Go app
3. Scan the QR code from the terminal
4. The app will connect automatically

### For Web Testing:
1. Press `w` in the Expo terminal
2. Opens in browser at `http://localhost:8081`

## 🔍 Finding Your IP Address

### Windows:
```bash
ipconfig
# Look for "Wireless LAN adapter Wi-Fi" -> IPv4 Address
```

### Mac:
```bash
ifconfig | grep "inet "
# Look for your WiFi interface (usually en0)
```

### Linux:
```bash
ip addr show
# Look for your WiFi interface (usually wlan0)
```

## 🚨 Troubleshooting

### "Network request failed"
- ✅ Check if backend is running: `http://YOUR_IP:8000/api/`
- ✅ Verify IP address in `src/config/network.ts`
- ✅ Ensure devices are on same network
- ✅ Check firewall settings

### "CORS error"
- ✅ Backend CORS is configured to allow all origins
- ✅ Restart Django server after changes

### "Connection refused"
- ✅ Start backend with: `python manage.py runserver 0.0.0.0:8000`
- ✅ Check if port 8000 is available
- ✅ Verify IP address is correct

## 🔄 Quick Network Switch

1. **Find new IP**: Run `node update-network.js`
2. **Restart backend**: `python manage.py runserver 0.0.0.0:8000`
3. **Restart Expo**: `npx expo start --clear`
4. **Test connection**: Scan QR code with mobile device

## 📋 Network Checklist

- [ ] Backend running on `0.0.0.0:8000`
- [ ] IP address updated in `src/config/network.ts`
- [ ] Mobile device on same network
- [ ] Firewall allows port 8000
- [ ] Expo server restarted
- [ ] QR code scanned with Expo Go

## 💡 Pro Tips

1. **Bookmark this file** for quick reference
2. **Use the auto-script** (`node update-network.js`) for easy switching
3. **Test with web first** before mobile (press `w` in Expo)
4. **Keep backend running** while developing
5. **Use mobile hotspot** when WiFi is unreliable

## 🆘 Still Having Issues?

1. Check the console for specific error messages
2. Verify network connectivity: `ping YOUR_IP`
3. Test backend directly: Open `http://YOUR_IP:8000/api/` in browser
4. Restart everything: Backend → Expo → Mobile app
