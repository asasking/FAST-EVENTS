import { useMemo, useState } from "react";

import { AuthField } from "@/components/auth-field";
import { AuthButton, AuthNotice, AuthScreen } from "@/components/auth-screen";
import {
  PickerField,
  SearchablePicker,
  type PickerOption,
} from "@/components/searchable-picker";
import {
  countryOptions,
  currencyOptions,
  type CountryOption,
  type CurrencyOption,
} from "@/data/market-options";
import { useTheme } from "@/hooks/use-theme";
import { fontSize } from "@/theme";
import { isValidInternationalPhoneNumber } from "@/utils/phone-number";

const countryPickerOptions: PickerOption[] = countryOptions.map((country) => {
  const currency = currencyOptions.find(
    (option) => option.code === country.defaultCurrency,
  );

  return {
    id: country.code,
    label: country.name,
    description: [
      country.code,
      currency
        ? `${currency.code} · ${currency.name}`
        : "No default currency listed",
      country.callingCode,
    ]
      .filter(Boolean)
      .join(" · "),
    leading: country.flag,
  };
});

const currencyPickerOptions: PickerOption[] = currencyOptions.map(
  (currency) => ({
    id: currency.code,
    label: `${currency.code} · ${currency.name}`,
    description: `Symbol: ${currency.symbol}`,
    leading: currency.symbol,
  }),
);

export default function SignupScreen() {
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(
    null,
  );
  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencyOption | null>(null);
  const [activePicker, setActivePicker] = useState<"country" | "currency" | null>(
    null,
  );
  const [isCodeStepVisible, setIsCodeStepVisible] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<"info" | "error">("info");

  const selectedCountryLabel = selectedCountry
    ? `${selectedCountry.flag}  ${selectedCountry.name}`
    : null;
  const selectedCurrencyLabel = selectedCurrency
    ? `${selectedCurrency.code} · ${selectedCurrency.name}`
    : null;

  const countryByCode = useMemo(
    () => new Map(countryOptions.map((country) => [country.code, country])),
    [],
  );
  const currencyByCode = useMemo(
    () => new Map(currencyOptions.map((currency) => [currency.code, currency])),
    [],
  );

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

  const createAccount = () => {
    if (username.trim().length < 3) {
      setNoticeTone("error");
      setNotice("Choose a username with at least 3 characters.");
      return;
    }

    if (!isValidInternationalPhoneNumber(phoneNumber)) {
      setNoticeTone("error");
      setNotice("Enter a valid international phone number.");
      return;
    }

    if (!selectedCountry || !selectedCurrency) {
      setNoticeTone("error");
      setNotice("Choose your home country and preferred currency.");
      return;
    }

    if (!isCodeStepVisible || !verificationCode.trim()) {
      setNoticeTone("error");
      setNotice("Request a verification code and enter it to continue.");
      return;
    }

    setNoticeTone("info");
    setNotice(
      "Signup is not connected yet. No SMS was sent and no account was created.",
    );
  };

  const selectCountry = (option: PickerOption) => {
    const country = countryByCode.get(option.id);
    if (!country) {
      return;
    }

    setSelectedCountry(country);
    setSelectedCurrency(
      country.defaultCurrency
        ? (currencyByCode.get(country.defaultCurrency) ?? null)
        : null,
    );
    setActivePicker(null);
  };

  const selectCurrency = (option: PickerOption) => {
    const currency = currencyOptions.find(
      (item) => item.code === option.id,
    );
    if (!currency) {
      return;
    }

    setSelectedCurrency(currency);
    setActivePicker(null);
  };

  return (
    <AuthScreen
      title="Create your account"
      subtitle="One username and phone number gets you started."
      variant="signup"
    >
      <AuthField
        autoCapitalize="none"
        autoComplete="username"
        label="Username"
        onChangeText={setUsername}
        placeholder="Choose a username"
        textContentType="username"
        value={username}
      />
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

      <PickerField
        label="Home country"
        onPress={() => setActivePicker("country")}
        placeholder="Select your country"
        value={selectedCountryLabel}
      />
      <PickerField
        label="Preferred currency"
        onPress={() => setActivePicker("currency")}
        placeholder={
          selectedCountry
            ? "Choose a currency"
            : "Select a country first"
        }
        value={selectedCurrencyLabel}
      />
      <AuthNotice>
        Selecting a country suggests its default currency. You can change the
        currency separately.
      </AuthNotice>

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
        onPress={requestCode}
        title={isCodeStepVisible ? "Resend code" : "Send verification code"}
        variant="secondary"
      />
      <AuthButton onPress={createAccount} title="Create account" />
      {notice ? <AuthNotice tone={noticeTone}>{notice}</AuthNotice> : null}

      <SearchablePicker
        onClose={() => setActivePicker(null)}
        onSelect={selectCountry}
        options={countryPickerOptions}
        selectedId={selectedCountry?.code ?? null}
        title="Countries"
        visible={activePicker === "country"}
      />
      <SearchablePicker
        onClose={() => setActivePicker(null)}
        onSelect={selectCurrency}
        options={currencyPickerOptions}
        selectedId={selectedCurrency?.code ?? null}
        title="Currencies"
        visible={activePicker === "currency"}
      />
    </AuthScreen>
  );
}
