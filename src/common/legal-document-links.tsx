import React, { FC } from "react";
import { View, Text, Linking, StyleProp, ViewStyle } from "react-native";
import { Pressable } from "@nowoo/common/pressable";

export const LEGAL_PRIVACY_POLICY_URL =
  "https://nowoo-a8038.web.app/legal/NoWoo_Privacy_Policy.pdf";
export const LEGAL_TERMS_URL =
  "https://nowoo-a8038.web.app/legal/NoWoo_Terms_and_Conditions.pdf";

type LegalDocumentLinksProps = {
  /** Muted text (e.g. separator) */
  mutedColor: string;
  /** Tappable link color */
  linkColor: string;
  style?: StyleProp<ViewStyle>;
};

export const LegalDocumentLinks: FC<LegalDocumentLinksProps> = ({
  mutedColor,
  linkColor,
  style,
}) => {
  const open = (url: string) => {
    Linking.openURL(url).catch(() => {
      /* ignore */
    });
  };

  return (
    <View
      style={[
        {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
        },
        style,
      ]}
    >
      <Pressable onPress={() => open(LEGAL_PRIVACY_POLICY_URL)} hitSlop={8}>
        <Text style={{ fontSize: 11, color: linkColor }}>Privacy Policy</Text>
      </Pressable>
      <Text style={{ fontSize: 11, color: mutedColor, marginHorizontal: 8 }}>·</Text>
      <Pressable onPress={() => open(LEGAL_TERMS_URL)} hitSlop={8}>
        <Text style={{ fontSize: 11, color: linkColor }}>Terms</Text>
      </Pressable>
    </View>
  );
};
