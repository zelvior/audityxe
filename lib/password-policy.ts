/**
 * Password policy for NEW passwords (sign-up and change-password).
 * Sign-in deliberately does NOT use this — existing accounts keep working
 * with whatever password they already have.
 *
 * Mirror these exact settings in Firebase Console → Authentication →
 * Settings → Password policy (enforce mode) so the rules also hold
 * server-side, for the hosted reset-password page, and against anyone
 * calling the Firebase Auth REST API directly:
 *   min 6, max 10, require uppercase, lowercase, numeric, non-alphanumeric.
 */
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 10;

export interface PasswordRule {
  id: "length" | "upper" | "lower" | "number" | "special";
  label: string;
  test: (pw: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: "length",
    label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`,
    test: (pw) => pw.length >= PASSWORD_MIN_LENGTH && pw.length <= PASSWORD_MAX_LENGTH,
  },
  { id: "upper", label: "One uppercase letter (A–Z)", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lower", label: "One lowercase letter (a–z)", test: (pw) => /[a-z]/.test(pw) },
  { id: "number", label: "One number (0–9)", test: (pw) => /[0-9]/.test(pw) },
  { id: "special", label: "One special character (e.g. ! @ # $ %)", test: (pw) => /[^A-Za-z0-9\s]/.test(pw) },
];

export function failedPasswordRules(pw: string): PasswordRule[] {
  return PASSWORD_RULES.filter((r) => !r.test(pw));
}

/** Returns a user-facing error message, or null when the password is acceptable. */
export function validatePassword(pw: string): string | null {
  if (pw.length > PASSWORD_MAX_LENGTH) return `Password must be at most ${PASSWORD_MAX_LENGTH} characters.`;
  if (pw.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  const failed = failedPasswordRules(pw);
  if (!failed.length) return null;
  return `Password needs: ${failed.map((r) => r.label.toLowerCase()).join(", ")}.`;
}
