export function normalizeInternationalPhoneNumber(value: string) {
  return value.replace(/[\s().-]/g, "");
}

export function isValidInternationalPhoneNumber(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(normalizeInternationalPhoneNumber(value));
}
