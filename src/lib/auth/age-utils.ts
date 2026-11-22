/**
 * Age calculation utilities for 18+ verification
 */

export function calculateAge(dob: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export function isAdult(dob: Date): boolean {
  return calculateAge(dob) >= 18;
}

export function getAgeRange(dob: Date): string {
  const age = calculateAge(dob);
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  return '45+';
}

export function validateDOB(dob: string): { valid: boolean; error?: string } {
  if (!dob) {
    return { valid: false, error: 'Date of birth is required' };
  }

  const parsed = new Date(dob);

  if (isNaN(parsed.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }

  const now = new Date();
  if (parsed > now) {
    return { valid: false, error: 'Date of birth cannot be in the future' };
  }

  const age = calculateAge(parsed);

  if (age > 120) {
    return { valid: false, error: 'Invalid date of birth' };
  }

  if (age < 18) {
    return { valid: false, error: 'You must be 18 or older to use Anon Connect' };
  }

  return { valid: true };
}
