#!/usr/bin/env node

// Script to help update network configuration
// Run with: node update-network.js

const os = require('os');
const fs = require('fs');
const path = require('path');

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        // Prefer WiFi interfaces, but use any available
        if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wlan')) {
          return interface.address;
        }
      }
    }
  }
  
  // If no WiFi found, return the first available IPv4 address
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  
  return 'localhost';
}

function updateNetworkConfig(newIP) {
  const configPath = path.join(__dirname, 'src', 'config', 'network.ts');
  
  try {
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Update the API_BASE_URL
    content = content.replace(
      /API_BASE_URL: '[^']*'/,
      `API_BASE_URL: 'http://${newIP}:8000/api'`
    );
    
    fs.writeFileSync(configPath, content);
    console.log(`✅ Updated network config with IP: ${newIP}`);
    console.log(`📱 Mobile app will now connect to: http://${newIP}:8000/api`);
    
  } catch (error) {
    console.error('❌ Error updating network config:', error.message);
  }
}

function main() {
  console.log('🔍 Finding your local IP address...\n');
  
  const ip = getLocalIPAddress();
  console.log(`📍 Your local IP address: ${ip}`);
  
  if (ip === 'localhost') {
    console.log('⚠️  Could not find a local IP address. Using localhost.');
    console.log('   Make sure your device is connected to the same network.');
  }
  
  console.log('\n🔄 Updating network configuration...');
  updateNetworkConfig(ip);
  
  console.log('\n📋 Next steps:');
  console.log('1. Make sure your Django backend is running on 0.0.0.0:8000');
  console.log('2. Restart your Expo development server');
  console.log('3. Connect your mobile device to the same WiFi network');
  console.log('4. Scan the QR code with Expo Go app');
  
  console.log('\n💡 Tips:');
  console.log('- If using mobile hotspot, run this script again');
  console.log('- If switching networks, run this script again');
  console.log('- Check that your firewall allows connections on port 8000');
}

main();
