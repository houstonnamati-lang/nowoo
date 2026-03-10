import React, { FC, useState } from "react";
import { View, Text, TextInput, Alert, ActivityIndicator, Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as AppleAuthentication from "expo-apple-authentication";
import { Pressable } from "@nowoo/common/pressable";
import { RootStackParamList } from "@nowoo/core/navigator";
import { useAuthStore } from "@nowoo/stores/auth";
import { getFirebaseAuth } from "@nowoo/config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  OAuthProvider,
  GoogleAuthProvider,
} from "firebase/auth";
import Ionicons from "@expo/vector-icons/Ionicons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, "Onboarding">;

export const OnboardingScreen: FC<OnboardingScreenProps> = ({ navigation }) => {
  const { colorScheme } = useColorScheme();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const bgColor = colorScheme === "dark" ? "#000000" : "#ffffff";
  const textColor = colorScheme === "dark" ? "#ffffff" : "#000000";
  const inputBg = colorScheme === "dark" ? "#1c1c1e" : "#f5f5f5";
  const borderColor = colorScheme === "dark" ? "#38383a" : "#e7e5e4";

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      navigation.replace("Home");
    } catch (error: any) {
      Alert.alert("Sign Up Error", error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      navigation.replace("Home");
    } catch (error: any) {
      Alert.alert("Sign In Error", error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    useAuthStore.getState().setSkipAuth(true);
    navigation.replace("Home");
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("Not Available", "Apple Sign-In is only available on iOS");
      return;
    }

    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Create Firebase credential from Apple credential
      const { identityToken } = credential;
      if (!identityToken) {
        throw new Error("Apple Sign-In failed: No identity token");
      }

      const provider = new OAuthProvider("apple.com");
      const firebaseCredential = provider.credential({
        idToken: identityToken,
        rawNonce: credential.nonce || undefined,
      });

      const auth = getFirebaseAuth();
      const userCredential = await signInWithCredential(auth, firebaseCredential);
      setUser(userCredential.user);
      navigation.replace("Home");
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") {
        // User canceled, don't show error
        return;
      }
      Alert.alert("Apple Sign-In Error", error.message || "Failed to sign in with Apple");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const userInfo = await GoogleSignin.signIn();
      console.log("GoogleSignin userInfo:", JSON.stringify(userInfo, null, 2));
      // Library can return either a plain object or { type, data }
      const payload: any = (userInfo as any).data ?? userInfo;
      const idToken = payload.idToken;

      if (!idToken) {
        throw new Error("Google Sign-In failed: No ID token");
      }

      const auth = getFirebaseAuth();
      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, googleCredential);
      setUser(userCredential.user);
      navigation.replace("Home");
    } catch (error: any) {
      Alert.alert("Google Sign-In Error", error.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: bgColor,
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Text
        style={{
          fontSize: 32,
          fontWeight: "bold",
          color: textColor,
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Welcome to NoWoo
      </Text>
      <Text
        style={{
          fontSize: 16,
          color: colorScheme === "dark" ? "#999999" : "#666666",
          marginBottom: 32,
          textAlign: "center",
        }}
      >
        {isSignUp ? "Create an account" : "Sign in to continue"}
      </Text>

      <TextInput
        style={{
          backgroundColor: inputBg,
          borderWidth: 1,
          borderColor: borderColor,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          color: textColor,
          marginBottom: 16,
        }}
        placeholder="Email"
        placeholderTextColor={colorScheme === "dark" ? "#666666" : "#999999"}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />

      <TextInput
        style={{
          backgroundColor: inputBg,
          borderWidth: 1,
          borderColor: borderColor,
          borderRadius: 8,
          padding: 12,
          fontSize: 16,
          color: textColor,
          marginBottom: 24,
        }}
        placeholder="Password"
        placeholderTextColor={colorScheme === "dark" ? "#666666" : "#999999"}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={isSignUp ? "password-new" : "password"}
      />

      <Pressable
        onPress={isSignUp ? handleSignUp : handleSignIn}
        disabled={loading}
        style={{
          backgroundColor: colorScheme === "dark" ? "#007AFF" : "#3b82f6",
          borderRadius: 8,
          padding: 16,
          alignItems: "center",
          marginBottom: 12,
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "600" }}>
            {isSignUp ? "Sign Up" : "Sign In"}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => setIsSignUp(!isSignUp)}
        style={{
          padding: 12,
          alignItems: "center",
        }}
      >
        <Text style={{ color: colorScheme === "dark" ? "#007AFF" : "#3b82f6", fontSize: 14 }}>
          {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
        </Text>
      </Pressable>

      <View style={{ marginTop: 24, flexDirection: "row", alignItems: "center", marginBottom: 24 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
        <Text style={{ marginHorizontal: 16, color: colorScheme === "dark" ? "#666666" : "#999999", fontSize: 14 }}>
          OR
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
      </View>

      {Platform.OS === "ios" && (
        <Pressable
          onPress={handleAppleSignIn}
          disabled={loading}
          style={{
            backgroundColor: colorScheme === "dark" ? "#ffffff" : "#000000",
            borderRadius: 8,
            padding: 16,
            alignItems: "center",
            marginBottom: 12,
            opacity: loading ? 0.6 : 1,
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          <Ionicons name="logo-apple" size={20} color={colorScheme === "dark" ? "#000000" : "#ffffff"} style={{ marginRight: 8 }} />
          <Text style={{ color: colorScheme === "dark" ? "#000000" : "#ffffff", fontSize: 16, fontWeight: "600" }}>
            Continue with Apple
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={handleGoogleSignIn}
        disabled={loading}
        style={{
          backgroundColor: "#ffffff",
          borderWidth: 1,
          borderColor: borderColor,
          borderRadius: 8,
          padding: 16,
          alignItems: "center",
          marginBottom: 12,
          opacity: loading ? 0.6 : 1,
          flexDirection: "row",
          justifyContent: "center",
        }}
      >
        <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginRight: 8 }} />
        <Text style={{ color: "#000000", fontSize: 16, fontWeight: "600" }}>
          Continue with Google
        </Text>
      </Pressable>

      <View style={{ marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: borderColor }}>
        <Pressable
          onPress={handleGuestMode}
          style={{
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colorScheme === "dark" ? "#999999" : "#666666", fontSize: 12 }}>
            Use in Guest Mode (Not Recommended)
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
