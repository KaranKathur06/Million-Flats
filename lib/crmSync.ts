import { prisma } from './prisma';

export async function syncUserToCRM(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`[CRM Sync] User ${email} not found`);
      return;
    }

    console.log(`[CRM Sync] Syncing user ${user.email} to internal CRM...`);
    
    const payload = {
      externalId: user.id,
      email: user.email,
      fullName: user.fullName || user.name,
      phone: user.phone,
      country: user.countryIso2,
      city: user.city,
      investmentGoal: user.investmentGoal,
      budgetMin: user.budgetMin,
      budgetMax: user.budgetMax,
      propertyTypes: user.propertyTypes,
      buyingTimeline: user.buyingTimeline,
      onboardingVersion: user.onboardingVersion,
      profileCompletion: user.profileCompletion,
      completedAt: user.profileCompletedAt,
    };

    // Simulated API Call
    // const response = await fetch('https://crm.millionflats.internal/api/v1/webhook/user_sync', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRM_API_KEY}` },
    //   body: JSON.stringify(payload)
    // });
    
    // if (!response.ok) throw new Error('CRM Sync Failed');
    
    console.log(`[CRM Sync] Successfully synced user ${user.email} to CRM.`);

  } catch (error) {
    console.error(`[CRM Sync Error] Failed to sync ${email}:`, error);
  }
}
