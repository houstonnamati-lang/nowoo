import React, { FC, useState } from "react";
import { View, Text, TextInput, Alert, ActivityIndicator, Platform } from "react-native";
import { useColorScheme } from "nativewind";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as AppleAuthentication from "expo-apple-authentication";
import * as AuthSession from "expo-auth-session";
import * as Crypto from "expo-crypto";
import Constants from "expo-constants";
import { Pressable } from "@nowoo/common/pressable";
import { RootStackParamList } from "@nowoo/core/navigator";
import { useAuthStore } from "@nowoo/stores/auth";
import { getFirebaseAuth } from "@nowoo/config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  OAuthProvider,
} from "firebase/auth";
import Ionicons from "@expo/vector-icons/Ionicons";

type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, "Onboarding">;

export const OnboardingScreen: FC<OnboardingScreenProps> = ({ navigation }) => {
  const { colorScheme } = useColorScheme();
  const { setUser, setSkipAuth } = useAuthStore();
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

  const handleSkip = () => {
    setSkipAuth(true);
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
    setLoading(true);
    try {
      if (!process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID) {
        Alert.alert("Configuration Error", "Google Client ID is not set. Please add EXPO_PUBLIC_GOOGLE_CLIENT_ID to your .env file.");
        setLoading(false);
        return;
      }

      // Generate a random nonce for security
      const randomString = Math.random().toString(36) + Date.now().toString(36);
      const nonceHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        randomString,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      // Convert base64 to base64url (URL-safe)
      const nonce = nonceHash.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

      // Generate redirect URI
      // Try Expo proxy first (for development), fallback to custom scheme (for production)
      const proxyUri = AuthSession.makeRedirectUri({ useProxy: true });
      const schemeUri = AuthSession.makeRedirectUri({ scheme: "com.nowoo.app" });
      
      // Use proxy URL if it's HTTPS (Expo proxy), otherwise use scheme
      let redirectUri = proxyUri.startsWith("https://") ? proxyUri : schemeUri;
      
      // If we got a local exp:// URL, try to construct Expo proxy URL
      if (redirectUri.startsWith("exp://")) {
        const username = Constants.expoConfig?.owner || 
                        Constants.expoConfig?.extra?.eas?.projectId?.split("-")[0] || 
                        "anonymous";
        const slug = Constants.expoConfig?.slug || "nowoo";
        redirectUri = `https://auth.expo.io/@${username}/${slug}`;
      }

      // Log the redirect URI so user can add it to Google Cloud Console
      console.log("=== Google OAuth Configuration ===");
      console.log("Redirect URI:", redirectUri);
      console.log("Proxy URI (attempted):", proxyUri);
      console.log("Scheme URI (fallback):", schemeUri);
      console.log("");
      console.log("⚠️  IMPORTANT: Add this EXACT Redirect URI to Google Cloud Console:");
      console.log("   " + redirectUri);
      console.log("   Go to: APIs & Services → Credentials → Your OAuth Client → Authorized redirect URIs");
      console.log("   Make sure it matches EXACTLY (including https:// and trailing slash if any)");
      console.log("===================================");
      
      // Validate redirect URI is HTTPS (required for Google OAuth)
      if (!redirectUri.startsWith("https://")) {
        Alert.alert(
          "Configuration Error",
          `Redirect URI must be HTTPS. Current: ${redirectUri}\n\nPlease ensure you're using the Expo proxy URL or a custom HTTPS domain.`
        );
        setLoading(false);
        return;
      }

      const request = new AuthSession.AuthRequest({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
        scopes: ["openid", "profile", "email"],
        responseType: AuthSession.ResponseType.IdToken,
        redirectUri,
        nonce,
        additionalParameters: {},
        extraParams: {},
      });

      console.log("OAuth Request Details:", {
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID?.substring(0, 20) + "...",
        redirectUri,
        hasNonce: !!nonce,
        scopes: ["openid", "profile", "email"],
      });

      const result = await request.promptAsync({
        authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
        usePKCE: false, // Google OAuth with id_token doesn't use PKCE
      });

      if (result.type !== "success") {
        if (result.type === "cancel") {
          return; // User canceled
        }
        console.error("Google OAuth Error:", result);
        if (result.type === "error") {
          console.error("Error details:", result.error);
          console.error("Error params:", result.params);
        }
        throw new Error(result.type === "error" ? (result.error?.message || "Google Sign-In failed") : "Google Sign-In was canceled or failed");
      }

      const { id_token } = result.params;
      if (!id_token) {
        throw new Error("Google Sign-In failed: No ID token");
      }

      // Create Firebase credential from Google credential
      const provider = new OAuthProvider("google.com");
      const firebaseCredential = provider.credential({
        idToken: id_token,
        rawNonce: nonce,
      });

      const auth = getFirebaseAuth();
      const userCredential = await signInWithCredential(auth, firebaseCredential);
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
          backgroundColor: colorScheme === "dark" ? "#ffffff" : "#ffffff",
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
        <Text style={{ color: textColor, fontSize: 16, fontWeight: "600" }}>
          Continue with Google
        </Text>
      </Pressable>

      <View style={{ marginTop: 32, paddingTop: 24, borderTopWidth: 1, borderTopColor: borderColor }}>
        <Pressable
          onPress={handleSkip}
          style={{
            padding: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colorScheme === "dark" ? "#999999" : "#666666", fontSize: 12 }}>
            Skip for Development
          </Text>
        </Pressable>
      </View>
    </View>
  );
};
