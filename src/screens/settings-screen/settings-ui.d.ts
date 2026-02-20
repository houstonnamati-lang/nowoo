import React from "react";
import { PropsWithChildren } from "react";

export interface SectionProps {
  label: string;
  hideBottomBorderAndroid?: boolean;
}

interface CommonItemProps {
  label?: string;
  secondaryLabel?: string;
}

export interface LinkItemProps extends CommonItemProps {
  value: string;
  onPress: () => unknown;
}

export interface PickerItemProps extends CommonItemProps {
  value: string;
  options: { label: string; value: string }[];
  onValueChange: (value: string) => unknown;
}

export interface SwitchItemProps extends CommonItemProps {
  value: boolean;
  onValueChange?: (newValue: boolean) => void;
}

export interface StepperItemProps extends CommonItemProps {
  value?: number | string;
  increaseDisabled?: boolean;
  decreaseDisabled?: boolean;
  onIncrease?: () => unknown;
  onDecrease?: () => unknown;
  fractionDigits?: number;
}

export interface RadioButtonItemProps extends CommonItemProps {
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Optional node (e.g. schedule dots) shown to the right of the label */
  labelRight?: React.ReactNode;
}

export interface MultiSelectItemProps extends CommonItemProps {
  selectedValues: string[];
  options: { label: string | React.ReactNode; value: string }[];
  onValueChange: (values: string[]) => unknown;
  /** Shown when nothing selected (e.g. "Default: Awake") */
  emptyLabel?: string;
}

export interface TextInputItemProps extends CommonItemProps {
  value: string;
  placeholder?: string;
  onValueChange: (value: string) => unknown;
  multiline?: boolean;
}

declare const SettingsUI: {
  Section: React.FC<PropsWithChildren<SectionProps>>;
  LinkItem: FC<LinkItemProps>;
  PickerItem: FC<PickerItemProps>;
  SwitchItem: FC<SwitchItemProps>;
  StepperItem: FC<StepperItemProps>;
  RadioButtonItem: FC<RadioButtonItemProps>;
  MultiSelectItem: FC<MultiSelectItemProps>;
  TextInputItem: FC<TextInputItemProps>;
};
