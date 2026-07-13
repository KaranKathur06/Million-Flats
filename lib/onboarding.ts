import { User } from "@prisma/client";

export const ONBOARDING_CURRENT_VERSION = 1;

/**
 * Calculates the profile completion percentage for a user based on Onboarding fields.
 */
export function calculateProfileCompletion(user: Partial<User>): number {
  if (!user) return 0;
  
  // Total weight: 100
  let score = 0;
  const totalWeight = 100;

  const hasName = Boolean(user.name || user.fullName);
  
  // Basic Information (30%)
  if (hasName) score += 10;
  if (user.email) score += 10;
  if (user.city || user.countryIso2) score += 5;
  if (user.purpose) score += 5;

  // Property Preferences (30%)
  if (user.interestedCountry) score += 5;
  if (user.budgetMin || user.budgetMax) score += 10;
  if (user.propertyTypes && user.propertyTypes.length > 0) score += 10;
  if (user.bedrooms && user.bedrooms.length > 0) score += 5;

  // Investment Profile (20%)
  if (user.buyingTimeline) score += 10;
  if (user.investmentGoal) score += 10;

  // Services & Communication (20%)
  if (user.servicesInterested && user.servicesInterested.length > 0) score += 10;
  if (user.communicationPrefs && user.communicationPrefs.length > 0) score += 10;

  return Math.min(Math.round((score / totalWeight) * 100), 100);
}
