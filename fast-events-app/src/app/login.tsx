import { useState } from "react";
import { useRouter } from "expo-router";

import { AuthField } from "@/components/auth-field";
import { AuthButton, AuthNotice, AuthScreen } from "@/components/auth-screen";
import { useResendCooldown } from "@/hooks/use-resend-cooldown";
import { useAuth } from "@/providers/auth-provider";
import {
  AuthApiError,
  requestLoginCode,
  verifyLoginCode,
} from "@/services/auth-api";
import { isValidInternationalPhoneNumber } from "@/utils/phone-number";

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeStepVisible, setIsCodeStepVisible] = useState(false);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"info" | "error">("info");
  const { clearCooldown, secondsRemaining, startCooldown } =
    useResendCooldown();
  const isBusy = isRequestingCode || isSigningIn;

  const requestCode = async () => {
    const normalizedPhone = phoneNumber.trim();
    if (!isValidInternationalPhoneNumber(normalizedPhone)) {
      setNoticeTone("error");
      setNotice(
        "Enter a valid phone number in international format, including + and country code.",
      );
      return;
    }

    setIsRequestingCode(true);
    setNotice(null);
    try {
      const request = await requestLoginCode(normalizedPhone);
      setIsCodeStepVisible(true);
      setVerificationCode("");
      startCooldown(request.resendAfterSeconds);
      setNoticeTone("info");
      setNotice(
        `If this number is eligible, a code will be sent. It expires in ${Math.ceil(request.expiresInSeconds / 60)} minutes.`,
      );
    } catch (error) {
      if (error instanceof AuthApiError) {
        startCooldown(error.retryAfterSeconds);
      }
      setNoticeTone("error");
      setNotice(
        error instanceof Error
          ? error.message
          : "We couldn't request a sign-in code. Please try again.",
      );
    } finally {
      setIsRequestingCode(false);
    }
  };

  const signInWithCode = async () => {
    const normalizedPhone = phoneNumber.trim();
    const normalizedCode = verificationCode.trim();

    if (!isValidInternationalPhoneNumber(normalizedPhone)) {
      setNoticeTone("error");
      setNotice("Enter a valid international phone number first.");
      return;
    }

    if (!/^\d{6}$/.test(normalizedCode)) {
      setNoticeTone("error");
      setNotice("Enter the 6-digit verification code to continue.");
      return;
    }

    setIsSigningIn(true);
    setNotice(null);
    try {
      const session = await verifyLoginCode(normalizedPhone, normalizedCode);
      await signIn(session);
      router.replace("/home");
    } catch (error) {
      if (error instanceof AuthApiError && error.retryAfterSeconds > 0) {
        startCooldown(error.retryAfterSeconds);
        setVerificationCode("");
      }
      setNoticeTone("error");
      setNotice(
        error instanceof Error
          ? error.message
          : "We couldn't verify the code. Please try again.",
      );
    } finally {
      setIsSigningIn(false);
    }
  };

  const changePhoneNumber = () => {
    setIsCodeStepVisible(false);
    setVerificationCode("");
    setNotice(null);
    clearCooldown();
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
        editable={!isBusy && !isCodeStepVisible}
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
          editable={!isBusy}
          keyboardType="number-pad"
          label="Verification code"
          maxLength={6}
          onChangeText={setVerificationCode}
          placeholder="6-digit code"
          value={verificationCode}
        />
      ) : null}

      {isCodeStepVisible ? (
        <>
          <AuthButton
            onPress={signInWithCode}
            title="Sign in"
            loading={isSigningIn}
            disabled={isBusy}
          />
          <AuthButton
            onPress={requestCode}
            title={
              secondsRemaining > 0
                ? `Resend code (${secondsRemaining}s)`
                : "Resend code"
            }
            variant="secondary"
            loading={isRequestingCode}
            disabled={isBusy || secondsRemaining > 0}
          />
          <AuthButton
            onPress={changePhoneNumber}
            title="Change phone number"
            variant="secondary"
            disabled={isBusy}
          />
        </>
      ) : (
        <AuthButton
          onPress={requestCode}
          title="Send sign-in code"
          loading={isRequestingCode}
          disabled={isBusy}
        />
      )}
      {notice ? <AuthNotice tone={noticeTone}>{notice}</AuthNotice> : null}
    </AuthScreen>
  );
}
