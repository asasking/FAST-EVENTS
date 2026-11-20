import { useState } from "react";

import { AuthField } from "@/components/auth-field";
import { AuthButton, AuthNotice, AuthScreen } from "@/components/auth-screen";
import { isValidInternationalPhoneNumber } from "@/utils/phone-number";

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeStepVisible, setIsCodeStepVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"info" | "error">("info");

  const requestCode = () => {
    if (!isValidInternationalPhoneNumber(phoneNumber)) {
      setNoticeTone("error");
      setNotice(
        "Enter a valid phone number in international format, including + and country code.",
      );
      return;
    }

    setIsCodeStepVisible(true);
    setNoticeTone("info");
    setNotice(
      "Placeholder only: no SMS was sent. Phone verification will be connected to Django later.",
    );
  };

  const signIn = () => {
    if (!isValidInternationalPhoneNumber(phoneNumber)) {
      setNoticeTone("error");
      setNotice("Enter a valid international phone number first.");
      return;
    }

    if (!verificationCode.trim()) {
      setNoticeTone("error");
      setNotice("Enter the verification code to continue.");
      return;
    }

    setNoticeTone("info");
    setNotice(
      "Authentication is not connected yet. No code was verified and no session was created.",
    );
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in securely with your phone number."
      variant="login"
    >
      <AuthField
        autoCapitalize="none"
        autoComplete="tel"
        keyboardType="phone-pad"
        label="Phone number"
        onChangeText={setPhoneNumber}
        placeholder="Include + country code"
        textContentType="telephoneNumber"
        value={phoneNumber}
      />

      {isCodeStepVisible ? (
        <AuthField
          autoComplete="one-time-code"
          keyboardType="number-pad"
          label="Verification code"
          maxLength={6}
          onChangeText={setVerificationCode}
          placeholder="6-digit code"
          value={verificationCode}
        />
      ) : null}

      <AuthButton
        onPress={isCodeStepVisible ? signIn : requestCode}
        title={isCodeStepVisible ? "Sign in" : "Send sign-in code"}
      />
      {notice ? <AuthNotice tone={noticeTone}>{notice}</AuthNotice> : null}
    </AuthScreen>
  );
}
