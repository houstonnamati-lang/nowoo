import { NavigationContainer, DefaultTheme, DarkTheme, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useColorScheme } from "nativewind";
import React, { FC, useEffect } from "react";
import { Platform, Button, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@nowoo/design/colors";
import { ExerciseScreen } from "@nowoo/screens/exercise-screen/exercise-screen";
import { HomeScreen } from "@nowoo/screens/home-screen/home-screen";
import { CustomSessionSetupScreen } from "@nowoo/screens/custom-session-setup-screen/custom-session-setup-screen";
import { OnboardingScreen } from "@nowoo/screens/onboarding-screen/onboarding-screen";
import { useAuthStore, useAuthHydration } from "@nowoo/stores/auth";
import {
  SettingsRootScreen,
  SettingsPatternPickerScreen,
  SettingsScheduleRiseScreen,
  SettingsScheduleResetScreen,
  SettingsScheduleRestoreScreen,
} from "@nowoo/screens/settings-screen/settings-screen";

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  Exercise: { customSettings?: import("@nowoo/screens/custom-session-setup-screen/custom-session-setup-screen").CustomSessionSettings } | undefined;
  Settings: undefined;
  CustomSessionSetup: undefined;
};
const RootStack = createNativeStackNavigator<RootStackParamList>();

export type SettingsStackParamList = {
  SettingsRoot: undefined;
  SettingsPatternPicker: undefined;
  SettingsScheduleRise: undefined;
  SettingsScheduleReset: undefined;
  SettingsScheduleRestore: undefined;
};

const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

export const Navigator: FC = () => {
  const { colorScheme } = useColorScheme();
  const authHydrated = useAuthHydration();
  const user = useAuthStore((state) => state.user);
  const skipAuth = useAuthStore((state) => state.skipAuth);
  const isAuthenticated = authHydrated && (skipAuth || user !== null);
  const navigationRef = useNavigationContainerRef();
  const baseTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const backgroundColor = colorScheme === "dark" ? "#000000" : colors["stone-100"];
  const theme = {
    ...baseTheme,
    dark: colorScheme === "dark",
    colors: {
      ...baseTheme.colors,
      background: backgroundColor,
    },
  };

  // Navigate based on auth state after hydration
  useEffect(() => {
    if (!authHydrated || !navigationRef.isReady()) return;
    
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (isAuthenticated && currentRoute === "Onboarding") {
      navigationRef.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } else if (!isAuthenticated && currentRoute !== "Onboarding" && currentRoute !== undefined) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: "Onboarding" }],
      });
    }
  }, [authHydrated, isAuthenticated, navigationRef]);

  // Wait for auth hydration before deciding initial route
  if (!authHydrated) {
    return (
      <SafeAreaProvider style={{ backgroundColor }}>
        <View style={{ flex: 1, backgroundColor }} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={{ backgroundColor }}>
      <NavigationContainer ref={navigationRef} theme={theme}>
        <RootStack.Navigator
          initialRouteName={isAuthenticated ? "Home" : "Onboarding"}
          screenOptions={{
            headerShown: false,
          }}
        >
          <RootStack.Screen
            name="Onboarding"
            component={OnboardingScreen}
            options={{
              animation: Platform.OS === "ios" ? "fade" : "simple_push",
            }}
          />
          <RootStack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              animation: Platform.OS === "ios" ? "fade" : "simple_push",
            }}
          />
          <RootStack.Screen
            name="Exercise"
            component={ExerciseScreen}
            options={{
              animation: Platform.OS === "ios" ? "fade" : "simple_push",
            }}
          />
          <RootStack.Screen
            name="CustomSessionSetup"
            component={CustomSessionSetupScreen}
            options={{
              presentation: "transparentModal",
              animation: "fade",
              headerShown: false,
              contentStyle: {
                backgroundColor: "transparent",
              },
            }}
          />
          <RootStack.Screen
            name="Settings"
            options={{
              presentation: Platform.select({
                ios: "modal",
              }),
              contentStyle: {
                backgroundColor: colorScheme === "dark" ? "#000000" : colors["stone-100"],
              },
            }}
          >
            {() => {
              const commonHeaderSettings = {
                headerShadowVisible: Platform.OS === "ios",
                headerStyle: {
                  backgroundColor:
                    colorScheme === "dark" ? "#000000" : colors["stone-100"],
                },
                headerTintColor: Platform.OS === "ios" ? undefined : colors["blue-400"],
              };
              return (
                <SettingsStack.Navigator 
                  initialRouteName="SettingsRoot"
                  screenOptions={{
                    contentStyle: {
                      backgroundColor: colorScheme === "dark" ? "#000000" : colors["stone-100"],
                    },
                  }}
                >
                  <SettingsStack.Screen
                    name="SettingsRoot"
                    component={SettingsRootScreen}
                    options={{
                      headerShown: true,
                      headerLargeTitle: true,
                      headerTitle: "Customizations",
                      headerLargeTitleShadowVisible: true,
                      headerShadowVisible: Platform.OS === "ios",
                      headerStyle: {
                        backgroundColor:
                          colorScheme === "dark" ? "#000000" : colors["stone-100"],
                      },
                    }}
                  />
                  <SettingsStack.Screen
                    name="SettingsPatternPicker"
                    component={SettingsPatternPickerScreen}
                    options={{
                      headerTitle: "Breathing Patterns",
                      ...commonHeaderSettings,
                    }}
                  />
                  <SettingsStack.Screen
                    name="SettingsScheduleRise"
                    component={SettingsScheduleRiseScreen}
                    options={{
                      headerTitle: "Rise",
                      ...commonHeaderSettings,
                      headerBackTitle: "Back",
                    }}
                  />
                  <SettingsStack.Screen
                    name="SettingsScheduleReset"
                    component={SettingsScheduleResetScreen}
                    options={{
                      headerTitle: "Reset",
                      ...commonHeaderSettings,
                      headerBackTitle: "Back",
                    }}
                  />
                  <SettingsStack.Screen
                    name="SettingsScheduleRestore"
                    component={SettingsScheduleRestoreScreen}
                    options={{
                      headerTitle: "Restore",
                      ...commonHeaderSettings,
                      headerBackTitle: "Back",
                    }}
                  />
                </SettingsStack.Navigator>
              );
            }}
          </RootStack.Screen>
        </RootStack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
};
