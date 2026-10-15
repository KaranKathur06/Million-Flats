import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateProfileCompletion, ONBOARDING_CURRENT_VERSION } from '@/lib/onboarding';
import { syncUserToCRM } from '@/lib/crmSync';
import { normalizeOnboardingCountryIso2 } from '@/lib/auth/onboardingCountry';

function isPrismaForeignKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2003';
}

export async function PATCH(req: Request) {
  let countryIso2ForWrite: string | null | undefined;

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const email = String(session.user.email).trim().toLowerCase();
    const body = await req.json().catch(() => ({}));
    const countryInput = normalizeOnboardingCountryIso2(body.country);
    if (countryInput.kind === 'invalid') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_COUNTRY',
          message: 'Country must be a two-letter ISO-2 code.',
        },
        { status: 400 },
      );
    }

    // Construct update data payload, filtering undefined values
    const dataToUpdate: any = {};
    const incomingName = body.name ?? body.fullName;
    if (incomingName !== undefined) {
      const normalizedName = typeof incomingName === 'string'
        ? incomingName.trim()
        : String(incomingName).trim();
      dataToUpdate.name = normalizedName || null;
    }
    if (body.email !== undefined && body.email !== email) dataToUpdate.email = body.email;
    if (countryInput.kind === 'empty') {
      countryIso2ForWrite = null;
      dataToUpdate.countryIso2 = null;
    } else if (countryInput.kind === 'value') {
      countryIso2ForWrite = countryInput.iso2;
      const country = await prisma.country.findUnique({
        where: { iso2: countryInput.iso2 },
        select: { iso2: true },
      });

      if (!country) {
        console.error('[Onboarding PATCH Error]: Country row is missing for ISO-2 code', {
          countryIso2: countryInput.iso2,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'COUNTRY_NOT_AVAILABLE',
            message: 'Country is temporarily unavailable. Please try again later.',
          },
          { status: 503 },
        );
      }

      dataToUpdate.countryIso2 = country.iso2;
    }
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

    const updatedUser = await prisma.user.update({
      where: { email },
      data: {
        ...dataToUpdate,
        profileCompletedAt: completion === 100 ? new Date() : undefined,
      }
    });

    if (completion === 100) {
      setTimeout(() => {
        syncUserToCRM(email).catch(console.error);
      }, 0);
    }

    return NextResponse.json({
      success: true,
      profileCompletion: completion,
      currentStep: updatedUser.currentOnboardingStep,
      completed: completion === 100,
    });
  } catch (error) {
    if (countryIso2ForWrite && isPrismaForeignKeyError(error)) {
      console.error('[Onboarding PATCH Error]: Country row disappeared during profile update', {
        countryIso2: countryIso2ForWrite,
        error,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'COUNTRY_NOT_AVAILABLE',
          message: 'Country is temporarily unavailable. Please try again later.',
        },
        { status: 503 },
      );
    }

    console.error('[Onboarding PATCH Error]:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
