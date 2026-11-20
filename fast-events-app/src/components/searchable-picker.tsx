import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/hooks/use-theme";
import { fontSize, radius, spacing } from "@/theme";

export type PickerOption = {
  id: string;
  label: string;
  description: string;
  leading?: string;
};

type SearchablePickerProps = {
  options: PickerOption[];
  selectedId: string | null;
  title: string;
  visible: boolean;
  onClose: () => void;
  onSelect: (option: PickerOption) => void;
};

type PickerFieldProps = {
  label: string;
  placeholder: string;
  value: string | null;
  onPress: () => void;
  disabled?: boolean;
};

export function PickerField({
  label,
  placeholder,
  value,
  onPress,
  disabled = false,
}: PickerFieldProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.fieldButton,
          {
            backgroundColor: colors.surfaceRaised,
            borderColor: colors.border,
            opacity: disabled ? 0.65 : 1,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.fieldValue,
            { color: value ? colors.text : colors.textMuted },
          ]}
        >
          {value ?? placeholder}
        </Text>
        <Ionicons color={colors.textMuted} name="chevron-down" size={18} />
      </Pressable>
    </View>
  );
}

export function SearchablePicker({
  options,
  selectedId,
  title,
  visible,
  onClose,
  onSelect,
}: SearchablePickerProps) {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) {
      setQuery("");
    }
  }, [visible]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();

    if (!normalizedQuery) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.description}`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close picker"
          accessibilityRole="button"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <SafeAreaView
          edges={["bottom"]}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              {title}
            </Text>
            <Pressable
              accessibilityLabel="Close picker"
              accessibilityRole="button"
              hitSlop={8}
              onPress={onClose}
              style={styles.closeButton}
            >
              <Ionicons color={colors.textSecondary} name="close" size={22} />
            </Pressable>
          </View>
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder={`Search ${title.toLocaleLowerCase()}`}
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            style={[
              styles.search,
              {
                backgroundColor: colors.surfaceRaised,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            value={query}
          />
          <FlatList
            data={filteredOptions}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(option) => option.id}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                No matches found.
              </Text>
            }
            renderItem={({ item }) => {
              const isSelected = item.id === selectedId;

              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  onPress={() => onSelect(item)}
                  style={[
                    styles.option,
                    isSelected && { backgroundColor: colors.primarySubtle },
                  ]}
                >
                  {item.leading ? (
                    <Text style={styles.leading}>{item.leading}</Text>
                  ) : null}
                  <View style={styles.optionCopy}>
                    <Text style={[styles.optionLabel, { color: colors.text }]}>
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.optionDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {item.description}
                    </Text>
                  </View>
                  {isSelected ? (
                    <Ionicons
                      color={colors.primary}
                      name="checkmark-circle"
                      size={20}
                    />
                  ) : null}
                </Pressable>
              );
            }}
            style={styles.list}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  fieldButton: {
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  fieldValue: {
    flex: 1,
    fontSize: fontSize.md,
    marginRight: spacing.sm,
  },
  modalRoot: {
    backgroundColor: "rgba(0,0,0,0.55)",
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    maxHeight: "85%",
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sheetHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: "800",
  },
  closeButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  search: {
    borderRadius: radius.sm,
    borderWidth: 1,
    fontSize: fontSize.md,
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  list: {
    marginTop: spacing.sm,
  },
  option: {
    alignItems: "center",
    borderRadius: radius.sm,
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  leading: {
    fontSize: 24,
    width: 32,
  },
  optionCopy: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.md,
    fontWeight: "700",
  },
  optionDescription: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  empty: {
    padding: spacing.lg,
    textAlign: "center",
  },
});
