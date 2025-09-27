import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, Image, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { usePosts } from '@/context/PostsContext';

const UploadScreen: React.FC = () => {
  const [caption, setCaption] = useState('');
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const { createPost, isLoading } = usePosts();

  const pickImage = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    // Request permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your camera');
      return;
    }

    // Launch camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage.uri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      } as any);
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }

      const result = await createPost(formData);
      if (result.success) {
        setCaption('');
        setSelectedImage(null);
        Alert.alert('Success', 'Post created successfully!');
      } else {
        Alert.alert('Error', result.message || 'Failed to create post');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload post');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Create New Post</Text>
      
      {selectedImage ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: selectedImage.uri }} style={styles.selectedImage} />
          <TouchableOpacity style={styles.changeImageButton} onPress={() => setSelectedImage(null)}>
            <Text style={styles.changeImageText}>Change Image</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.imagePickerContainer}>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            <Text style={styles.imagePickerText}>📁 Choose from Gallery</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.imagePicker} onPress={takePhoto}>
            <Text style={styles.imagePickerText}>📷 Take Photo</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <TextInput
        style={styles.input}
        placeholder="Write a caption..."
        value={caption}
        onChangeText={setCaption}
        multiline
        numberOfLines={3}
      />
      
      <TouchableOpacity 
        style={[styles.button, (!selectedImage || isLoading) && styles.buttonDisabled]}
        onPress={handleUpload}
        disabled={!selectedImage || isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Uploading...' : 'Share Post'}
        </Text>
      </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  imagePickerContainer: {
    marginBottom: 20,
  },
  imagePicker: {
    borderWidth: 2,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  imagePickerText: {
    fontSize: 16,
    color: '#666',
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  selectedImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  changeImageButton: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  changeImageText: {
    color: '#666',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UploadScreen;
