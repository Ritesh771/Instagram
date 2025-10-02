import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// Import screens
import FeedScreen from "@/screens/FeedScreen";
import UploadScreen from "@/screens/UploadScreen";
import ProfileScreen from "@/screens/ProfileScreen";

const Tab = createBottomTabNavigator();

const TabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          bottom: 10,
          left: 16,
          right: 16,
          elevation: 5,
          backgroundColor: "#fff",
          borderRadius: 20,
          height: 60,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 6,
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadScreen}
        options={{
          tabBarIcon: () => (
            <LinearGradient
              colors={["#007AFF", "#005BBB"]}
              style={styles.uploadButton}
            >
              <Ionicons name="add" size={30} color="#fff" />
            </LinearGradient>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  uploadButton: {
    width: 55,
    height: 55,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 25, // floating effect
    shadowColor: "#007AFF",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 6,
    elevation: 8,
  },
});

export default TabNavigator;
