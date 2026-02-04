import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import { useColorScheme } from "nativewind";
import React, { FC, PropsWithChildren, useState } from "react";
import { LayoutAnimation, Switch, Text, TextInput, View, ViewStyle } from "react-native";
import { Pressable } from "@breathly/common/pressable";
import { colors } from "@breathly/design/colors";
import {
  LinkItemProps,
  PickerItemProps,
  RadioButtonItemProps,
  StepperItemProps,
  SwitchItemProps,
  SectionProps,
  MultiSelectItemProps,
  TextInputItemProps,
} from "./settings-ui";

const Section: React.FC<PropsWithChildren<SectionProps>> = ({ label, children }) => {
  const { colorScheme } = useColorScheme();
  return (
    <View style={{ paddingTop: 16 }}>
      <Text
        style={{
          marginBottom: 8,
          paddingHorizontal: 16,
          fontSize: 12,
          textTransform: "uppercase",
          color: colorScheme === "dark" ? "#999999" : undefined,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          borderRadius: 12,
          backgroundColor: colorScheme === "dark" ? "#1c1c1e" : "#ffffff",
        }}
      >
        {React.Children.map(children, (child, index) =>
          index === 0 || !child ? (
            child
          ) : (
            <>
              <View
                style={{
                  marginLeft: 16,
                  height: 0.5,
                  backgroundColor: colorScheme === "dark" ? "#38383a" : "#e7e5e4",
                }}
              />
              {child}
            </>
          )
        )}
      </View>
    </View>
  );
};

export interface BaseItemProps {
  label?: string;
  secondaryLabel?: string;
  iconName?: any;
  iconBackgroundColor?: string;
  style?: ViewStyle;
}

const BaseItem: FC<PropsWithChildren<BaseItemProps>> = ({
  label,
  iconName,
  iconBackgroundColor,
  secondaryLabel,
  children,
}) => {
  const { colorScheme } = useColorScheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingLeft: 16, paddingRight: 28 }}>
      {(iconName || label) && (
        <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1, flex: 1, maxWidth: "50%", marginRight: 8 }}>
          {iconName && (
            <View style={{ marginRight: 8, borderRadius: 6, backgroundColor: iconBackgroundColor }}>
              <Ionicons style={{ padding: 4 }} name={iconName} size={18} color="white" />
            </View>
          )}
          <View style={{ flexDirection: "column", flexShrink: 1, flex: 1 }}>
            <Text 
              style={{ color: colorScheme === "dark" ? "#ffffff" : undefined }}
              numberOfLines={2}
            >
              {label}
            </Text>
            {secondaryLabel && (
              <Text
                style={{ color: colorScheme === "dark" ? "#999999" : undefined }}
                numberOfLines={2}
              >
                {secondaryLabel}
              </Text>
            )}
          </View>
        </View>
      )}
      <View style={{ flexShrink: 0, marginLeft: 8, minWidth: 36, paddingRight: 4 }}>
        {children}
      </View>
    </View>
  );
};

export const LinkItem: FC<LinkItemProps> = ({ value, onPress, ...baseProps }) => {
  const { colorScheme } = useColorScheme();
  return (
    <Pressable onPress={onPress}>
      <BaseItem {...baseProps}>
        <View className="flex-row items-center">
          <Text style={{ color: colorScheme === "dark" ? "#999999" : undefined }}>{value}</Text>
          <Ionicons
            style={{ padding: 4 }}
            name={"chevron-forward"}
            size={18}
            color={colorScheme === "dark" ? "#999999" : colors["slate-500"]}
          />
        </View>
      </BaseItem>
    </Pressable>
  );
};

export const PickerItem: FC<PickerItemProps> = ({
  value,
  options,
  onValueChange,
  ...baseProps
}) => {
  const { colorScheme } = useColorScheme();
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    LayoutAnimation.easeInEaseOut();
    setExpanded((prevExpanded) => !prevExpanded);
  };
  const selectedOption = options?.find((option) => option.value === value);
  const displayLabel = selectedOption?.label || value || "Unknown";
  const hasSelection = value && selectedOption;

  return (
    <>
      <Pressable onPress={toggleExpanded}>
        <BaseItem {...baseProps}>
          <View className="flex-row items-center" style={{ flexShrink: 1, maxWidth: "100%" }}>
            <Text 
              style={{ 
                color: colorScheme === "dark" ? "#007AFF" : undefined,
                flexShrink: 1
              }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayLabel}
            </Text>
            {hasSelection && (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colorScheme === "dark" ? "#007AFF" : colors["blue-500"]}
                style={{ marginLeft: 6, flexShrink: 0 }}
              />
            )}
          </View>
        </BaseItem>
      </Pressable>
      {expanded && options && (
        <Picker selectedValue={value} onValueChange={onValueChange}>
          {options.map(({ label, value }) => (
            <Picker.Item
              key={value}
              label={label}
              value={value}
              color={colorScheme === "dark" ? "white" : undefined}
            />
          ))}
        </Picker>
      )}
    </>
  );
};

export const SwitchItem: FC<SwitchItemProps> = ({ value, onValueChange, ...baseProps }) => {
  return (
    <BaseItem {...baseProps}>
      <Switch value={value} onValueChange={onValueChange} />
    </BaseItem>
  );
};

export const StepperItem: FC<StepperItemProps> = ({
  value,
  increaseDisabled,
  decreaseDisabled,
  onIncrease,
  onDecrease,
  fractionDigits,
  ...baseProps
}) => {
  const { colorScheme } = useColorScheme();
  return (
    <BaseItem {...baseProps}>
      <View
        className="flex-row rounded-md border-hairline border-stone-200"
        style={{ borderColor: colorScheme === "dark" ? "#38383a" : undefined, flexShrink: 0 }}
      >
        <Pressable
          className="items-center justify-center  rounded-l-md bg-gray-100 px-3 py-1"
          style={{
            opacity: decreaseDisabled ? 0.2 : 1,
            backgroundColor: colorScheme === "dark" ? "#2c2c2e" : undefined,
          }}
          onPress={onDecrease}
          onLongPressInterval={onDecrease}
          disabled={decreaseDisabled}
        >
          <Ionicons
            name={"remove"}
            size={18}
            color={colorScheme === "dark" ? "white" : colors["slate-500"]}
          />
        </Pressable>
        <View style={{ minWidth: 70, paddingHorizontal: 8, alignItems: "center", justifyContent: "center" }}>
          <Text
            className="text-center font-breathly-mono dark:text-white"
            style={{ fontVariant: ["tabular-nums"] }}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.7}
          >
            {typeof value === "number" && fractionDigits > 0
              ? value.toFixed(fractionDigits)
              : value}
          </Text>
        </View>
        <Pressable
          className="items-center justify-center  rounded-r-md bg-gray-100 px-3 py-1"
          style={{
            opacity: increaseDisabled ? 0.2 : 1,
            backgroundColor: colorScheme === "dark" ? "#2c2c2e" : undefined,
          }}
          onPress={onIncrease}
          onLongPressInterval={onIncrease}
          disabled={increaseDisabled}
        >
          <Ionicons
            name={"add"}
            size={18}
            color={colorScheme === "dark" ? "white" : colors["slate-500"]}
          />
        </Pressable>
      </View>
    </BaseItem>
  );
};

export const RadioButtonItem: FC<RadioButtonItemProps> = ({
  label,
  secondaryLabel,
  selected,
  onPress,
  disabled,
  ...baseProps
}) => {
  const { colorScheme } = useColorScheme();
  return (
    <BaseItem {...baseProps}>
      <Pressable
        onPress={onPress}
        className="flex-shrink flex-row items-center py-2"
        style={{ opacity: disabled ? 0.5 : 1 }}
        disabled={disabled}
      >
        <View className="flex-shrink">
          <Text className="dark:text-white" style={{ color: colorScheme === "dark" ? "#ffffff" : undefined }}>
            {label}
          </Text>
          <Text style={{ color: colorScheme === "dark" ? "#999999" : undefined }}>
            {secondaryLabel}
          </Text>
        </View>
        <View style={{ width: 28, alignItems: "center", justifyContent: "center", marginRight: 4 }}>
          {selected && (
            <Ionicons name="checkmark-circle" size={18} color={colorScheme === "dark" ? "#007AFF" : colors["blue-500"]} />
          )}
        </View>
      </Pressable>
    </BaseItem>
  );
};

export const MultiSelectItem: FC<MultiSelectItemProps> = ({
  selectedValues,
  options,
  onValueChange,
  ...baseProps
}) => {
  const { colorScheme } = useColorScheme();
  const [expanded, setExpanded] = useState(false);
  const toggleExpanded = () => {
    LayoutAnimation.easeInEaseOut();
    setExpanded((prevExpanded) => !prevExpanded);
  };

  const toggleOption = (value: string) => {
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];
    onValueChange(newValues);
  };

  const displayLabel =
    selectedValues.length === 0
      ? "None selected"
      : selectedValues.length === 1
      ? options.find((opt) => opt.value === selectedValues[0])?.label || "1 selected"
      : `${selectedValues.length} selected`;

  return (
    <>
      <Pressable onPress={toggleExpanded}>
        <BaseItem {...baseProps}>
          <View className="flex-row items-center">
            <Text style={{ color: colorScheme === "dark" ? "#007AFF" : undefined }}>
              {displayLabel}
            </Text>
            <Ionicons
              style={{ padding: 4, marginLeft: 4 }}
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colorScheme === "dark" ? "#999999" : colors["slate-500"]}
            />
          </View>
        </BaseItem>
      </Pressable>
      {expanded && options && (
        <View style={{ paddingLeft: 16, paddingBottom: 8 }}>
          {options.map((option, index) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <View key={option.value}>
                {index > 0 && (
                  <View
                    style={{
                      marginLeft: 0,
                      height: 0.5,
                      backgroundColor: colorScheme === "dark" ? "#38383a" : "#e7e5e4",
                    }}
                  />
                )}
                <Pressable onPress={() => toggleOption(option.value)}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                    }}
                  >
                    <Text style={{ color: colorScheme === "dark" ? "#ffffff" : undefined }}>
                      {option.label}
                    </Text>
                    <Ionicons
                      name={isSelected ? "checkbox" : "checkbox-outline"}
                      size={20}
                      color={isSelected ? "#007AFF" : colorScheme === "dark" ? "#999999" : colors["slate-500"]}
                    />
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </>
  );
};

export const TextInputItem: FC<TextInputItemProps> = ({
  value,
  placeholder,
  onValueChange,
  multiline = false,
  ...baseProps
}) => {
  const { colorScheme } = useColorScheme();
  if (multiline) {
    return (
      <View style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
        {baseProps.label && (
          <Text style={{ 
            marginBottom: 8,
            color: colorScheme === "dark" ? "#ffffff" : undefined 
          }}>
            {baseProps.label}
          </Text>
        )}
        <TextInput
          style={{
            flex: 1,
            textAlign: "left",
            textAlignVertical: "top",
            color: colorScheme === "dark" ? "#ffffff" : undefined,
            minHeight: 60,
            padding: 8,
            borderRadius: 8,
            backgroundColor: colorScheme === "dark" ? "#2c2c2e" : "#f5f5f5",
            borderWidth: 1,
            borderColor: colorScheme === "dark" ? "#38383a" : "#e7e5e4",
          }}
          value={value}
          placeholder={placeholder}
          placeholderTextColor={colorScheme === "dark" ? "#999999" : colors["slate-500"]}
          onChangeText={onValueChange}
          multiline={multiline}
        />
      </View>
    );
  }
  return (
    <BaseItem {...baseProps}>
      <TextInput
        style={{
          flex: 1,
          textAlign: "right",
          color: colorScheme === "dark" ? "#ffffff" : undefined,
        }}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={colorScheme === "dark" ? "#999999" : colors["slate-500"]}
        onChangeText={onValueChange}
        multiline={multiline}
      />
    </BaseItem>
  );
};

export const SettingsUI = {
  Section,
  LinkItem,
  PickerItem,
  SwitchItem,
  StepperItem,
  RadioButtonItem,
  MultiSelectItem,
  TextInputItem,
};
