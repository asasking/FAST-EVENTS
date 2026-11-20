import { getCountryDataList, getEmojiFlag } from "countries-list";
import type { TCurrencyCode } from "countries-list";
import { currencies } from "countries-list/currencies";

export type CountryOption = {
  code: string;
  name: string;
  flag: string;
  callingCode: string | null;
  currencyCodes: TCurrencyCode[];
  defaultCurrency: TCurrencyCode | null;
};

export type CurrencyOption = {
  code: TCurrencyCode;
  name: string;
  symbol: string;
};

export const countryOptions: CountryOption[] = getCountryDataList()
  .filter((country) => !country.userAssigned)
  .map((country) => {
    const currencyCodes = country.currency.filter(
      (code) => !currencies[code].withdrawn && code !== "XXX",
    );

    return {
      code: country.iso2,
      name: country.name,
      flag: getEmojiFlag(country.iso2),
      callingCode: country.phone[0] ? `+${country.phone[0]}` : null,
      currencyCodes,
      defaultCurrency: currencyCodes[0] ?? null,
    };
  })
  .sort((left, right) => left.name.localeCompare(right.name));

const usedCurrencyCodes = new Set(
  countryOptions.flatMap((country) => country.currencyCodes),
);

export const currencyOptions: CurrencyOption[] = Array.from(usedCurrencyCodes)
  .map((code) => ({
    code,
    name: currencies[code].name,
    symbol: currencies[code].symbol,
  }))
  .sort((left, right) => left.name.localeCompare(right.name));
