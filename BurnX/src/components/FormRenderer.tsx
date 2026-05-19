import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import {
  createElement,
  type ChangeEvent,
  useState,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  type TextStyle,
  TextInput,
  View,
} from "react-native";
import type { Question } from "../constants/forms/onboarding";
import { HospitalPickerField } from "./HospitalPickerField";
import { isQuestionVisible } from "../lib/question-visibility";
import { colors } from "../theme/colors";
import { radius, spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

function formatDateForValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateValue(v: string | undefined): Date {
  if (!v) return new Date();
  const parts = v.split("-").map(Number);
  if (parts.length >= 3) {
    return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
  }
  return new Date();
}

const webDateInputStyle: object = {
  minHeight: 52,
  width: "100%",
  borderRadius: radius.md,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: colors.borderStrong,
  backgroundColor: colors.surface,
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
  fontSize: 16,
  color: colors.text,
  outlineStyle: "none",
  boxSizing: "border-box",
};

/** Avoid spreading `typography.body` onto TextInput — lineHeight breaks single-line fields on Android. */
const INPUT_FONT: TextStyle = {
  fontSize: 16,
  fontWeight: "500",
  color: colors.text,
};

function TextQuestionField({
  question,
  raw,
  onChange,
}: {
  question: Extract<Question, { type: "text" }>;
  raw: unknown;
  onChange: (id: string, value: unknown) => void;
}) {
  const [focused, setFocused] = useState(false);
  const multiline = question.multiline === true;
  const value = typeof raw === "string" ? raw : "";
  const helpId = `${question.id}_help`;

  return (
    <View style={styles.field}>
      <Text nativeID={helpId} style={styles.label}>
        {question.label}
        {question.required ? " *" : ""}
      </Text>
      {question.helpText ? (
        <Text style={styles.help}>{question.helpText}</Text>
      ) : null}
      <TextInput
        accessibilityLabelledBy={helpId}
        multiline={multiline}
        onBlur={() => setFocused(false)}
        onChangeText={(t) => onChange(question.id, t)}
        onFocus={() => setFocused(true)}
        placeholder={question.placeholder}
        placeholderTextColor={colors.textMuted}
        scrollEnabled={multiline}
        style={[
          styles.input,
          INPUT_FONT,
          multiline ? styles.textInputMultiline : styles.textInputSingle,
          focused && styles.inputFocused,
        ]}
        textAlignVertical={multiline ? "top" : "center"}
        value={value}
      />
    </View>
  );
}

function NumberQuestionField({
  question,
  raw,
  onChange,
}: {
  question: Extract<Question, { type: "number" }>;
  raw: unknown;
  onChange: (id: string, value: unknown) => void;
}) {
  const [focused, setFocused] = useState(false);
  const value = raw !== undefined && raw !== null ? String(raw) : "";

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {question.label}
        {question.required ? " *" : ""}
        {question.unit ? ` (${question.unit})` : ""}
      </Text>
      {question.helpText ? (
        <Text style={styles.help}>{question.helpText}</Text>
      ) : null}
      <TextInput
        keyboardType="decimal-pad"
        onBlur={() => setFocused(false)}
        onChangeText={(t) => {
          if (t === "") {
            onChange(question.id, "");
            return;
          }
          const n = Number.parseFloat(t.replace(",", "."));
          onChange(question.id, Number.isFinite(n) ? n : t);
        }}
        onFocus={() => setFocused(true)}
        placeholder={question.unit ?? "0"}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          INPUT_FONT,
          styles.numberInput,
          focused && styles.inputFocused,
        ]}
        textAlignVertical="center"
        value={value}
      />
    </View>
  );
}

function DateQuestionField({
  question,
  raw,
  onChange,
}: {
  question: Extract<Question, { type: "date" }>;
  raw: unknown;
  onChange: (id: string, value: unknown) => void;
}) {
  const str = typeof raw === "string" ? raw : "";
  const d = parseDateValue(str);
  const [open, setOpen] = useState(false);

  if (Platform.OS === "web") {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {question.label}
          {question.required ? " *" : ""}
        </Text>
        {question.helpText ? (
          <Text style={styles.help}>{question.helpText}</Text>
        ) : null}
        {createElement("input", {
          type: "date",
          name: question.id,
          value: str,
          max: formatDateForValue(new Date()),
          onChange: (e: ChangeEvent<HTMLInputElement>) => {
            const v = e.currentTarget.value;
            if (v) onChange(question.id, v);
          },
          style: webDateInputStyle,
        })}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {question.label}
        {question.required ? " *" : ""}
      </Text>
      {question.helpText ? (
        <Text style={styles.help}>{question.helpText}</Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.input,
          styles.inputChoiceTrigger,
          pressed && styles.pressedChoice,
        ]}
      >
        <Text style={styles.choiceText}>{str || "Select date"}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          display="default"
          maximumDate={new Date()}
          mode="date"
          value={d}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            if (event.type === "dismissed") {
              setOpen(false);
              return;
            }
            setOpen(false);
            if (date) onChange(question.id, formatDateForValue(date));
          }}
        />
      ) : null}
    </View>
  );
}

function TimeQuestionField({
  question,
  raw,
  onChange,
}: {
  question: Extract<Question, { type: "time" }>;
  raw: unknown;
  onChange: (id: string, value: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const str = typeof raw === "string" ? raw : "";
  const base =
    str && str.includes(":")
      ? (() => {
          const [h, m] = str.split(":").map(Number);
          const x = new Date();
          x.setHours(h ?? 0, m ?? 0, 0, 0);
          return x;
        })()
      : new Date();

  if (Platform.OS === "web") {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {question.label}
          {question.required ? " *" : ""}
        </Text>
        {question.helpText ? (
          <Text style={styles.help}>{question.helpText}</Text>
        ) : null}
        {createElement("input", {
          type: "time",
          name: question.id,
          value: str,
          onChange: (e: ChangeEvent<HTMLInputElement>) => {
            const v = e.currentTarget.value;
            if (v) onChange(question.id, v);
          },
          style: webDateInputStyle,
        })}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {question.label}
        {question.required ? " *" : ""}
      </Text>
      {question.helpText ? (
        <Text style={styles.help}>{question.helpText}</Text>
      ) : null}
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.input,
          styles.inputChoiceTrigger,
          pressed && styles.pressedChoice,
        ]}
      >
        <Text style={styles.choiceText}>{str || "Select time"}</Text>
      </Pressable>
      {open ? (
        <DateTimePicker
          display="default"
          mode="time"
          value={base}
          onChange={(event: DateTimePickerEvent, date?: Date) => {
            if (event.type === "dismissed") {
              setOpen(false);
              return;
            }
            setOpen(false);
            if (!date) return;
            const hh = String(date.getHours()).padStart(2, "0");
            const mm = String(date.getMinutes()).padStart(2, "0");
            onChange(question.id, `${hh}:${mm}`);
          }}
        />
      ) : null}
    </View>
  );
}

type FormRendererProps = {
  questions: Question[];
  answers: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
};

export function FormRenderer({ questions, answers, onChange }: FormRendererProps) {
  return (
    <View style={styles.stack}>
      {questions.map((q) =>
        isQuestionVisible(q, answers) ? (
          <QuestionField key={q.id} answers={answers} onChange={onChange} question={q} />
        ) : null,
      )}
    </View>
  );
}

function QuestionField({
  question,
  answers,
  onChange,
}: {
  question: Question;
  answers: Record<string, unknown>;
  onChange: (id: string, value: unknown) => void;
}) {
  const raw = answers[question.id];

  switch (question.type) {
    case "text": {
      return (
        <TextQuestionField onChange={onChange} question={question} raw={raw} />
      );
    }
    case "number":
      return (
        <NumberQuestionField onChange={onChange} question={question} raw={raw} />
      );
    case "date":
      return (
        <DateQuestionField onChange={onChange} question={question} raw={raw} />
      );
    case "time":
      return (
        <TimeQuestionField onChange={onChange} question={question} raw={raw} />
      );
    case "single_select":
      return (
        <View style={styles.field}>
          <Text style={styles.label}>
            {question.label}
            {question.required ? " *" : ""}
          </Text>
          {question.helpText ? (
            <Text style={styles.help}>{question.helpText}</Text>
          ) : null}
          {question.options.map((opt) => {
            const selected = raw === opt;
            return (
              <Pressable
                key={opt}
                onPress={() => onChange(question.id, opt)}
                style={({ pressed }) => [
                  styles.optionRow,
                  selected && styles.optionRowSelected,
                  pressed && styles.pressedChoice,
                ]}
              >
                <Ionicons
                  color={selected ? colors.primary : colors.textMuted}
                  name={selected ? "radio-button-on" : "radio-button-off"}
                  size={20}
                />
                <Text style={styles.optionLabel}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    case "multi_select": {
      const selected = Array.isArray(raw)
        ? (raw as unknown[]).map(String)
        : [];
      const toggle = (opt: string) => {
        const set = new Set(selected);
        if (set.has(opt)) set.delete(opt);
        else set.add(opt);
        onChange(question.id, [...set]);
      };
      return (
        <View style={styles.field}>
          <Text style={styles.label}>
            {question.label}
            {question.required ? " *" : ""}
          </Text>
          {question.helpText ? (
            <Text style={styles.help}>{question.helpText}</Text>
          ) : null}
          {question.options.map((opt) => {
            const on = selected.includes(opt);
            return (
              <Pressable
                key={opt}
                onPress={() => toggle(opt)}
                style={({ pressed }) => [
                  styles.optionRow,
                  on && styles.optionRowSelected,
                  pressed && styles.pressedChoice,
                ]}
              >
                <Ionicons
                  color={on ? colors.primary : colors.textMuted}
                  name={on ? "checkbox" : "square-outline"}
                  size={20}
                />
                <Text style={styles.optionLabel}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      );
    }
    case "scale": {
      const nums: number[] = [];
      for (let n = question.min; n <= question.max; n += 1) nums.push(n);
      const val =
        typeof raw === "number"
          ? raw
          : raw !== undefined && raw !== ""
            ? Number(raw)
            : undefined;
      return (
        <View style={styles.field}>
          <Text style={styles.label}>
            {question.label}
            {question.required ? " *" : ""}
          </Text>
          {question.helpText ? (
            <Text style={styles.help}>{question.helpText}</Text>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.scaleRow}>
              {nums.map((n) => {
                const selected = val === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => onChange(question.id, n)}
                    style={({ pressed }) => [
                      styles.scalePill,
                      selected && styles.scalePillSelected,
                      pressed && styles.pressedChoice,
                    ]}
                  >
                    <Text
                      style={[
                        styles.scalePillText,
                        selected && styles.scalePillTextSelected,
                      ]}
                    >
                      {n}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      );
    }
    case "boolean": {
      const v = Boolean(raw);
      return (
        <View style={styles.field}>
          <View style={styles.booleanRow}>
            <View style={styles.booleanCopy}>
              <Text style={styles.label}>
                {question.label}
                {question.required ? " *" : ""}
              </Text>
              {question.helpText ? (
                <Text style={styles.help}>{question.helpText}</Text>
              ) : null}
            </View>
            <Switch
              value={v}
              onValueChange={(x) => onChange(question.id, x)}
            />
          </View>
        </View>
      );
    }
    case "hospital_picker": {
      const hid = typeof raw === "string" ? raw : "";
      return (
        <HospitalPickerField
          helpText={question.helpText}
          label={question.label}
          required={question.required}
          value={hid}
          onChange={(id) => onChange(question.id, id)}
        />
      );
    }
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs + 2,
  },
  label: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
    letterSpacing: 0.2,
    textTransform: "uppercase",
    fontSize: 11,
  },
  help: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "none",
    marginBottom: spacing.xs,
  },
  input: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  textInputSingle: {
    minHeight: 52,
    paddingVertical: Platform.OS === "ios" ? 15 : 12,
  },
  textInputMultiline: {
    minHeight: 120,
    paddingTop: Platform.OS === "ios" ? 14 : 12,
    paddingBottom: Platform.OS === "ios" ? 14 : 12,
  },
  numberInput: {
    minHeight: 52,
    paddingVertical: Platform.OS === "ios" ? 15 : 12,
  },
  inputFocused: {
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  inputChoiceTrigger: {
    justifyContent: "center",
  },
  choiceText: {
    ...typography.body,
    fontSize: 16,
    color: colors.text,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs,
  },
  optionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  optionLabel: {
    ...typography.body,
    flex: 1,
    color: colors.text,
  },
  scaleRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scalePill: {
    minWidth: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  scalePillSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  scalePillText: {
    ...typography.bodyStrong,
    color: colors.text,
  },
  scalePillTextSelected: {
    color: colors.surface,
  },
  booleanRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  booleanCopy: {
    flex: 1,
  },
  pressedChoice: {
    opacity: 0.85,
  },
});
