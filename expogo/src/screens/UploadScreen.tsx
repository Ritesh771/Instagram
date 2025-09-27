import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { getApiUrl, getBaseUrl } from '@/config/network';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { usePosts } from '@/context/PostsContext';
import { useSecurity } from '@/context/SecurityContext';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';

const UploadScreen = ({ navigation }: any) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const { addPost } = usePosts();
  const { screenshotProtectionEnabled } = useSecurity();

  // Enable screenshot protection for the upload screen
  useScreenshotProtection({
    enabled: screenshotProtectionEnabled,
    message: 'Screenshots of uploads are not allowed'
  });

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photo library to upload images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setError('');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your camera to take photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!imageUri) {
      setError('Please select an image');
      return;
    }
    if (!caption.trim()) {
      setError('Please enter a caption');
      return;
    }

    setIsLoading(true);
    setError('');
    
    const result = await addPost(imageUri, caption);
    
    if (result.success) {
      Alert.alert(
        "Upload Successful",
        "Your post has been uploaded successfully!",
        [
          {
            text: "OK",
            onPress: () => {
              setImageUri(null);
              setCaption('');
              navigation.navigate('Feed');
            },
          },
        ]
      );
    } else {
      setError(result.message || 'Upload failed');
      Alert.alert("Upload Failed", result.message);
    }
    setIsLoading(false);
  };

  const showImagePicker = () => {
    Alert.alert(
      "Select Image",
      "Choose how you want to add an image",
      [
        { text: "Camera", onPress: takePhoto },
        { text: "Photo Library", onPress: pickImage },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const testConnection = async () => {
    try {
      const baseUrl = getBaseUrl();
      console.log('[Network] Testing connection to:', baseUrl);
      const response = await fetch(baseUrl + '/health/');
      console.log('[Network] Test response:', response.status);
      Alert.alert(
        'Connection Test',
        `Server responded with status ${response.status}. API URL: ${baseUrl}`
      );
    } catch (error: any) {
      console.error('[Network] Test failed:', error);
      Alert.alert(
        'Connection Failed',
        `Could not reach server at ${getBaseUrl()}. Error: ${error?.message || 'Unknown error'}`
      );
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#ffffff', '#f8f9fa']}
        style={styles.gradient}
      >
        {/* Add connection test button */}
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={testConnection}
        >
          <Text style={styles.debugButtonText}>Test Connection</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Create Post</Text>
              <Text style={styles.headerSubtitle}>Share your moment with the world</Text>
            </View>

            {/* Error Message */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Image Selection */}
            <View style={styles.imageSection}>
              {imageUri ? (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.image} />
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={showImagePicker}
                  >
                    <Ionicons name="camera" size={20} color="white" />
                    <Text style={styles.changeImageText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.imagePlaceholder} onPress={showImagePicker}>
                  <LinearGradient
                    colors={['#E1306C', '#F56040']}
                    style={styles.placeholderGradient}
                  >
                    <Ionicons name="camera" size={40} color="white" />
                    <Text style={styles.placeholderText}>Tap to add image</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>

            {/* Caption Input */}
            <View style={styles.captionSection}>
              <Text style={styles.captionLabel}>Caption</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="What's happening?"
                value={caption}
                onChangeText={(value) => {
                  setCaption(value);
                  if (error) setError('');
                }}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Upload Button */}
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleUpload}
              disabled={isLoading}
            >
              <LinearGradient
                colors={['#E1306C', '#F56040']}
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Share Post</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugButton: {
    position: 'absolute',
    top: 40,
    right: 10,
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
    zIndex: 1000,
  },
  debugButtonText: {
    fontSize: 12,
    color: '#6c757d',
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  content: {
    paddingTop: 50,
  },
  header: {
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
    textAlign: 'center',
  },
  imageSection: {
    marginBottom: 30,
  },
  imageContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  changeImageButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  changeImageText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '600',
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  placeholderGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  captionSection: {
    marginBottom: 30,
  },
  captionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#212529',
    minHeight: 100,
  },
  button: {
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default UploadScreen;
