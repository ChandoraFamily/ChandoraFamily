import type { Person } from "@/types/person";

export type SupportedLanguage = "en" | "hi";

/**
 * Returns the formatted display name of a person.
 * If language is 'hi' (Hindi):
 *   - Checks if person has `hindiName` filled.
 *   - If `hindiName` is present and non-empty, returns it.
 *   - If NO hindiName is available, seamlessly falls back to the English name.
 * If language is 'en':
 *   - Returns the English full name (firstName, middleName, lastName).
 */
export function formatPersonName(
  person: Partial<Person> | null | undefined,
  lang: SupportedLanguage = "en",
): string {
  if (!person) return "";

  if (lang === "hi" && person.hindiName && person.hindiName.trim()) {
    return person.hindiName.trim();
  }

  const parts = [person.firstName, person.middleName, person.lastName].filter(Boolean);
  return parts.join(" ").trim();
}

/**
 * Alias for formatPersonName for backwards compatibility.
 */
export function fullName(
  person: Partial<Person> | null | undefined,
  lang: SupportedLanguage = "en",
): string {
  return formatPersonName(person, lang);
}
