import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateProfileCompletion, ONBOARDING_CURRENT_VERSION } from '@/lib/onboarding';
import { syncUserToCRM } from '@/lib/crmSync';

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const email = String(session.user.email).trim().toLowerCase();
    const body = await req.json().catch(() => ({}));

    // Construct update data payload, filtering undefined values
    const dataToUpdate: any = {};
    if (body.fullName !== undefined) dataToUpdate.fullName = body.fullName;
    if (body.email !== undefined && body.email !== email) dataToUpdate.email = body.email;
    if (body.country !== undefined) dataToUpdate.countryIso2 = body.country; // Basic map
    if (body.city !== undefined) dataToUpdate.city = body.city;
    if (body.preferredLanguage !== undefined) dataToUpdate.preferredLanguage = body.preferredLanguage;
    if (body.occupation !== undefined) dataToUpdate.occupation = body.occupation;
    if (body.ageGroup !== undefined) dataToUpdate.ageGroup = body.ageGroup;
    if (body.purpose !== undefined) dataToUpdate.purpose = body.purpose;

    if (body.interestedCountry !== undefined) dataToUpdate.interestedCountry = body.interestedCountry;
    if (body.budgetMin !== undefined) dataToUpdate.budgetMin = Number(body.budgetMin) || null;
    if (body.budgetMax !== undefined) dataToUpdate.budgetMax = Number(body.budgetMax) || null;
    if (Array.isArray(body.propertyTypes)) dataToUpdate.propertyTypes = body.propertyTypes;
    if (Array.isArray(body.bedrooms)) dataToUpdate.bedrooms = body.bedrooms;
    if (Array.isArray(body.preferredCities)) dataToUpdate.preferredCities = body.preferredCities;
    if (Array.isArray(body.preferredLocalities)) dataToUpdate.preferredLocalities = body.preferredLocalities;

    if (body.buyingTimeline !== undefined) dataToUpdate.buyingTimeline = body.buyingTimeline;
    if (body.investmentGoal !== undefined) dataToUpdate.investmentGoal = body.investmentGoal;
    if (Array.isArray(body.servicesInterested)) dataToUpdate.servicesInterested = body.servicesInterested;
    if (Array.isArray(body.communicationPrefs)) dataToUpdate.communicationPrefs = body.communicationPrefs;
    if (body.currentOnboardingStep !== undefined) dataToUpdate.currentOnboardingStep = body.currentOnboardingStep;

    // Fetch existing user to merge and calculate correct profile completion
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
    }

    const mergedUser = { ...user, ...dataToUpdate };
    const completion = calculateProfileCompletion(mergedUser);

    dataToUpdate.profileCompletion = completion;
    dataToUpdate.onboardingVersion = ONBOARDING_CURRENT_VERSION;

    if (completion === 100) {
      dataToUpdate.profileCompletedAt = new Date();
      // Trigger CRM background job
      setTimeout(() => {
        syncUserToCRM(email).catch(console.error);
      }, 0);
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: dataToUpdate
    });

    return NextResponse.json({
      success: true,
      profileCompletion: completion,
      currentStep: updatedUser.currentOnboardingStep,
    });
  } catch (error) {
    console.error('[Onboarding PATCH Error]:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
