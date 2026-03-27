import React, { FC, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  PanResponder,
  PanResponderGestureState,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import Ionicons from "@expo/vector-icons/Ionicons";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useAuthStore } from "@nowoo/stores/auth";
import { getFirebaseAuth } from "@nowoo/config/firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  OAuthProvider,
  GoogleAuthProvider,
} from "firebase/auth";
import { LegalDocumentLinks } from "@nowoo/common/legal-document-links";

interface AccountCreationSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AccountCreationSheet: FC<AccountCreationSheetProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { colorScheme } = useColorScheme();
  const insets = useSafeAreaInsets();
  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);

  const bgColor = colorScheme === "dark" ? "#1c1c1e" : "#ffffff";
  const textColor = colorScheme === "dark" ? "#ffffff" : "#000000";
  const inputBg = colorScheme === "dark" ? "#2c2c2e" : "#f5f5f5";
  const borderColor = colorScheme === "dark" ? "#38383a" : "#e7e5e4";

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => Math.abs(gestureState.dy) > 4,
      onPanResponderRelease: (_, gestureState: PanResponderGestureState) => {
        if (gestureState.dy > 40) {
          onClose();
        }
      },
    })
  );

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
      onSuccess();
      onClose();
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
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert("Sign In Error", error.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
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
      const { identityToken } = credential;
      if (!identityToken) throw new Error("Apple Sign-In failed: No identity token");
      const provider = new OAuthProvider("apple.com");
      const firebaseCredential = provider.credential({
        idToken: identityToken,
        rawNonce: credential.nonce || undefined,
      });
      const auth = getFirebaseAuth();
      const userCredential = await signInWithCredential(auth, firebaseCredential);
      setUser(userCredential.user);
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.code === "ERR_REQUEST_CANCELED") return;
      Alert.alert("Apple Sign-In Error", error.message || "Failed to sign in with Apple");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const userInfo = await GoogleSignin.signIn();
      console.log("GoogleSignin userInfo (guest):", JSON.stringify(userInfo, null, 2));

      // Library can return either a plain object or { type, data }
      const payload: any = (userInfo as any).data ?? userInfo;
      const idToken = payload.idToken;

      if (!idToken) {
        throw new Error("Google Sign-In failed: No ID token");
      }

      const auth = getFirebaseAuth();
      const firebaseCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(auth, firebaseCredential);
      setUser(userCredential.user);
      onSuccess();
      onClose();
    } catch (error: any) {
      Alert.alert("Google Sign-In Error", error.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={insets.top}
      >
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)" }} onPress={onClose} />
        <View
          pointerEvents="box-none"
          style={{
            backgroundColor: bgColor,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            height: Dimensions.get("window").height * 0.9,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 24,
          }}
        >
          <View
            {...panResponder.current.panHandlers}
            style={{ paddingTop: 12, paddingBottom: 8, alignItems: "center" }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                backgroundColor: colorScheme === "dark" ? "#333" : "#ccc",
                borderRadius: 2,
              }}
            />
          </View>
          <Text style={{ fontSize: 20, fontWeight: "600", color: textColor, marginBottom: 8 }}>
            Free account required to use streaks
          </Text>
          <Text style={{ fontSize: 14, color: colorScheme === "dark" ? "#999" : "#666", marginBottom: 20 }}>
            Sign in or create an account to track streaks and moods across devices
          </Text>
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            <TextInput
              style={{
                backgroundColor: inputBg,
                borderWidth: 1,
                borderColor,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: textColor,
                marginBottom: 12,
              }}
              placeholder="Email"
              placeholderTextColor={colorScheme === "dark" ? "#666" : "#999"}
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
                borderColor,
                borderRadius: 8,
                padding: 12,
                fontSize: 16,
                color: textColor,
                marginBottom: 16,
              }}
              placeholder="Password"
              placeholderTextColor={colorScheme === "dark" ? "#666" : "#999"}
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
                padding: 14,
                alignItems: "center",
                marginBottom: 12,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
                  {isSignUp ? "Create account" : "Sign in"}
                </Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => setIsSignUp(!isSignUp)}
              style={{ padding: 8, alignItems: "center", marginBottom: 20 }}
            >
              <Text style={{ color: colorScheme === "dark" ? "#007AFF" : "#3b82f6", fontSize: 14 }}>
                {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Create one"}
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
              <Text style={{ marginHorizontal: 12, color: colorScheme === "dark" ? "#666" : "#999", fontSize: 12 }}>OR</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: borderColor }} />
            </View>
            {Platform.OS === "ios" && (
              <Pressable
                onPress={handleAppleSignIn}
                disabled={loading}
                style={{
                  backgroundColor: colorScheme === "dark" ? "#fff" : "#000",
                  borderRadius: 8,
                  padding: 14,
                  alignItems: "center",
                  marginBottom: 12,
                  opacity: loading ? 0.6 : 1,
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="logo-apple" size={20} color={colorScheme === "dark" ? "#000" : "#fff"} style={{ marginRight: 8 }} />
                <Text style={{ color: colorScheme === "dark" ? "#000" : "#fff", fontSize: 16, fontWeight: "600" }}>
                  Continue with Apple
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleGoogleSignIn}
              disabled={loading}
              style={{
                backgroundColor: colorScheme === "dark" ? "#2c2c2e" : "#fff",
                borderWidth: 1,
                borderColor,
                borderRadius: 8,
                padding: 14,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                opacity: loading ? 0.6 : 1,
              }}
            >
              <Ionicons name="logo-google" size={20} color="#4285F4" style={{ marginRight: 8 }} />
              <Text style={{ color: textColor, fontSize: 16, fontWeight: "600" }}>
                Continue with Google
              </Text>
            </Pressable>
          </ScrollView>
          <LegalDocumentLinks
            mutedColor={colorScheme === "dark" ? "#666666" : "#94a3b8"}
            linkColor={colorScheme === "dark" ? "#5e9eff" : "#2563eb"}
            style={{ marginTop: 16 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
