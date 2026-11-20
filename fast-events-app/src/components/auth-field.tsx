import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { fontSize, radius, spacing } from "@/theme";

type AuthFieldProps = Omit<TextInputProps, "style"> & {
  label: string;
};

export function AuthField({ label, ...inputProps }: AuthFieldProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        {...inputProps}
        onBlur={(event) => {
          setIsFocused(false);
          inputProps.onBlur?.(event);
        }}
        onFocus={(event) => {
          setIsFocused(true);
          inputProps.onFocus?.(event);
        }}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.primary}
        style={[
          styles.input,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: isFocused ? colors.accent : colors.border,
            color: colors.text,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  input: {
    borderRadius: radius.sm,
    borderWidth: 1,
    fontSize: fontSize.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
});
