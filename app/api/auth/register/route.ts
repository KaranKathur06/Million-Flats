import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { parsePhoneNumberFromString } from 'libphonenumber-js'
import crypto from 'crypto'
import { VerificationService } from '@/lib/auth/verification-service'

export const runtime = 'nodejs'

function getClientIp(req: Request) {
  const xf = req.headers.get('x-forwarded-for')
  if (xf) return xf.split(',')[0]?.trim() || 'unknown'
  return 'unknown'
}


function safeString(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim()
}

function roleLabel(role: string) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'AGENT') return 'Agent'
  return 'User'
}

function getRoleScopedLoginRedirect(type: string, email?: string) {
  const t = String(type || '').toLowerCase()
  const base = t === 'agent' ? '/agent/auth?tab=login' : '/auth/user/login'
  const safeEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!safeEmail) return base
  return `${base}?email=${encodeURIComponent(safeEmail)}`
}

// OTP generation now handled by VerificationService.sendRegistrationOtp()

function normalizePhone(input: string) {
  return String(input || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^0-9+ ]/g, '')
}

function normalizeIso2(v: unknown) {
  const s = String(v || '').trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(s)) return ''
  return s
}

function normalizeNationalNumber(v: unknown) {
  const digits = String(v || '').replace(/\D/g, '')
  return digits
}

async function validateAndNormalizePhone(params: {
  phoneRaw: string
  phoneCountryIso2Raw?: unknown
  phoneNationalNumberRaw?: unknown
}): Promise<
  | { ok: false; message: string }
  | {
    ok: true
    phoneE164: string
    phoneCountryIso2: string
    phoneCountryIso2ForFk: string | null
    phoneNationalNumber: string
  }
> {
  const phoneE164 = normalizePhone(params.phoneRaw)
  if (!phoneE164.startsWith('+') || phoneE164.replace(/[^0-9]/g, '').length < 8) {
    return { ok: false, message: 'Invalid phone number format.' }
  }

  const parsed = parsePhoneNumberFromString(phoneE164)
  if (!parsed?.isValid()) {
    return { ok: false, message: 'Invalid phone number format.' }
  }

  const parsedIso2 = String(parsed.country || '').toUpperCase()
  const parsedNational = String(parsed.nationalNumber || '')

  const suppliedIso2 = normalizeIso2(params.phoneCountryIso2Raw)
  const suppliedNational = normalizeNationalNumber(params.phoneNationalNumberRaw)

  const phoneCountryIso2 = suppliedIso2 || parsedIso2
  const phoneNationalNumber = suppliedNational || parsedNational

  if (!phoneCountryIso2) {
    return { ok: false, message: 'Phone country is required.' }
  }

  const country = await (prisma as any).country
    ?.findUnique({ where: { iso2: phoneCountryIso2 }, select: { iso2: true, dialCode: true, isActive: true } })
    .catch(() => null)

  if (country) {
    if (!country?.iso2 || !country?.isActive) {
      return { ok: false, message: 'Invalid phone country.' }
    }

    const countryDial = String(country.dialCode || '')
    const parsedDial = `+${String(parsed.countryCallingCode || '')}`
    if (countryDial && parsedDial && countryDial !== parsedDial) {
      return { ok: false, message: 'Phone country does not match dial code.' }
    }
  }

  if (phoneNationalNumber !== parsedNational) {
    return { ok: false, message: 'Phone number does not match selected country.' }
  }

  return {
    ok: true,
    phoneE164,
    phoneCountryIso2,
    phoneCountryIso2ForFk: country?.iso2 ? String(country.iso2) : null,
    phoneNationalNumber,
  }
}

function isStrongPassword(pw: string) {
  const p = String(pw || '')
  if (p.length < 8) return false
  if (!/[a-zA-Z]/.test(p)) return false
  if (!/[0-9]/.test(p)) return false
  return true
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    const name = safeString(body?.name)
    const email = safeString(body?.email).toLowerCase()
    const password = safeString(body?.password)
    const phone = normalizePhone(safeString(body?.phone))
    const phoneCountryIso2 = normalizeIso2(body?.phoneCountryIso2)
    const phoneNationalNumber = normalizeNationalNumber(body?.phoneNationalNumber)
    const type = safeString(body?.type)
    const acceptedTerms = Boolean(body?.acceptedTerms)

    if (!name || !email || !type) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 })
    }

    const ip = getClientIp(req)

    if (type === 'user') {
      if (!password) {
        return NextResponse.json({ success: false, message: 'Password required' }, { status: 400 })
      }

      const existingUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
      if (existingUser) {
        if (existingUser.role === 'AGENT' || existingUser.agent) {
          return NextResponse.json(
            {
              success: false,
              message: `This email is already registered as a ${roleLabel('AGENT')}. Please use a different email.`,
            },
            { status: 400 }
          )
        }

        if (!existingUser.password) {
          const hashedPassword = await bcrypt.hash(password, 10)
          const updated = await prisma.user.update({
            where: { id: existingUser.id },
            data: { password: hashedPassword },
          })

          if (!updated.verified) {
            await VerificationService.sendRegistrationOtp(email, 'user', updated.name, ip)

            return NextResponse.json(
              {
                success: true,
                message: 'Password set successfully. Please verify your email.',
                requiresVerification: true,
                redirectTo: `/user/verify?email=${encodeURIComponent(email)}`,
              },
              { status: 200 }
            )
          }

          return NextResponse.json(
            { success: true, message: 'Password set successfully', redirectTo: '/user/onboarding' },
            { status: 200 }
          )
        }

        const isValidPassword = await bcrypt.compare(password, existingUser.password)
        if (!isValidPassword) {
          return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 })
        }

        if (!existingUser.verified) {
          await VerificationService.sendRegistrationOtp(email, 'user', existingUser.name, ip)

          return NextResponse.json(
            {
              success: true,
              message: 'OTP sent to your email',
              requiresVerification: true,
              redirectTo: `/user/verify?email=${encodeURIComponent(email)}`,
            },
            { status: 200 }
          )
        }

        return NextResponse.json(
          {
            success: true,
            message: 'Account already exists. Please sign in.',
            redirectTo: getRoleScopedLoginRedirect('user', email),
          },
          { status: 200 }
        )
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const phoneNormalized = phone
        ? await validateAndNormalizePhone({
          phoneRaw: phone,
          phoneCountryIso2Raw: phoneCountryIso2,
          phoneNationalNumberRaw: phoneNationalNumber,
        })
        : null

      if (phoneNormalized && !phoneNormalized.ok) {
        return NextResponse.json({ success: false, message: phoneNormalized.message }, { status: 400 })
      }

      const user = await (prisma as any).user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: phoneNormalized && phoneNormalized.ok ? phoneNormalized.phoneE164 : phone || null,
          phoneCountryIso2: phoneNormalized && phoneNormalized.ok ? phoneNormalized.phoneCountryIso2ForFk : null,
          phoneNationalNumber: phoneNormalized && phoneNormalized.ok ? phoneNormalized.phoneNationalNumber : null,
          role: 'USER',
          verified: false,
        },
      })

      await VerificationService.sendRegistrationOtp(email, 'user', user.name, ip)

      return NextResponse.json(
        {
          success: true,
          message: 'Registration successful. Please verify your email.',
          requiresVerification: true,
          redirectTo: `/user/verify?email=${encodeURIComponent(email)}`,
        },
        { status: 200 }
      )
    }

    if (type === 'agent') {
      // Phase 1 - low friction agent signup: only basic identity + phone + credentials
      if (!password || !phone) {
        return NextResponse.json({ success: false, message: 'Missing required fields for agent' }, { status: 400 })
      }

      if (!acceptedTerms) {
        return NextResponse.json({ success: false, message: 'Please accept the terms and privacy policy' }, { status: 400 })
      }

      if (!isStrongPassword(password)) {
        return NextResponse.json(
          { success: false, message: 'Password must be at least 8 characters and include letters and numbers.' },
          { status: 400 }
        )
      }

      const phoneNormalized = await validateAndNormalizePhone({
        phoneRaw: phone,
        phoneCountryIso2Raw: phoneCountryIso2,
        phoneNationalNumberRaw: phoneNationalNumber,
      })

      if (!phoneNormalized.ok) {
        return NextResponse.json({ success: false, message: phoneNormalized.message }, { status: 400 })
      }

      const existingUser = await prisma.user.findUnique({ where: { email }, include: { agent: true } })
      if (existingUser) {
        const existingRole = String(existingUser.role || '').toUpperCase()

        if (existingUser.agent) {
          return NextResponse.json(
            {
              success: false,
              message: `This email is already registered as a ${roleLabel('AGENT')}. Please use a different email.`,
            },
            { status: 400 }
          )
        }

        if (existingRole !== 'AGENT' && existingRole !== 'ADMIN') {
          return NextResponse.json(
            {
              success: false,
              message: `This email is already registered as a ${roleLabel(existingRole)}. Please use a different email.`,
            },
            { status: 400 }
          )
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const user = existingUser
        ? await (prisma as any).user.update({
          where: { id: existingUser.id },
          data: {
            name: existingUser.name || name,
            password: existingUser.password || hashedPassword,
            phone: existingUser.phone || phoneNormalized.phoneE164 || null,
            phoneCountryIso2: (existingUser as any).phoneCountryIso2 || phoneNormalized.phoneCountryIso2ForFk || null,
            phoneNationalNumber: (existingUser as any).phoneNationalNumber || phoneNormalized.phoneNationalNumber || null,
            role: 'AGENT',
          },
        })
        : await (prisma as any).user.create({
          data: {
            name,
            email,
            password: hashedPassword,
            phone: phoneNormalized.phoneE164 || null,
            phoneCountryIso2: phoneNormalized.phoneCountryIso2ForFk || null,
            phoneNationalNumber: phoneNormalized.phoneNationalNumber || null,
            role: 'AGENT',
            verified: false,
          },
        })

      if (!existingUser?.agent) {
        try {
          await (prisma as any).agent.create({
            data: {
              userId: user.id,
              verificationStatus: 'PENDING',
              approved: false,
              profileStatus: 'DRAFT',
              profileCompletion: 0,
            } as any,
          })
        } catch (e: any) {
          const code = e?.code ? String(e.code) : ''
          if (code === 'P2002') {
            return NextResponse.json(
              { success: false, message: 'Email or license number already exists.' },
              { status: 400 }
            )
          }
          throw e
        }
      }

      await VerificationService.sendRegistrationOtp(email, 'agent', user.name, ip)

      return NextResponse.json(
        {
          success: true,
          message: 'Registration successful. Please verify your email.',
          requiresVerification: true,
          redirectTo: `/agent/verify?email=${encodeURIComponent(email)}`,
        },
        { status: 200 }
      )
    }

    if (type === 'agency') {
      if (!password) {
        return NextResponse.json({ success: false, message: 'Password required' }, { status: 400 })
      }

      if (!isStrongPassword(password)) {
        return NextResponse.json(
          { success: false, message: 'Password must be at least 8 characters and include letters and numbers.' },
          { status: 400 }
        )
      }

      // Don't include agencyProfile in the join — it may reference columns
      // that haven't been migrated yet (e.g., AI_agency_score), which causes
      // the query to fail silently and triggers a P2002 on the fallback create.
      const existingUser = await prisma.user.findUnique({ where: { email } }).catch((err: any) => {
        console.error('[register/agency] findUnique error:', err?.message)
        return null
      })

      // Check if user has a different role
      if (existingUser) {
        const existingRole = String(existingUser.role || '').toUpperCase()
        if (existingRole !== 'AGENCY' && existingRole !== 'ADMIN') {
          return NextResponse.json(
            { success: false, message: `This email is already registered as a ${roleLabel(existingRole)}. Please use a different email.` },
            { status: 400 }
          )
        }
      }

      // Check if agency profile exists separately (safe query)
      const existingAgencyProfile = existingUser
        ? await prisma.agencyProfile.findUnique({ where: { userId: existingUser.id }, select: { id: true } }).catch(() => null)
        : null

      const hashedPassword = await bcrypt.hash(password, 10)

      let user = existingUser
      if (existingUser) {
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: existingUser.name || name,
            password: existingUser.password || hashedPassword,
            role: 'AGENCY',
          },
        })
      } else {
        try {
          user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: 'AGENCY', verified: false },
          })
        } catch (createErr: any) {
          // P2002 = unique constraint (email already exists but findUnique failed)
          if (createErr?.code === 'P2002') {
            // Recover: fetch the user and update instead
            const recovered = await prisma.user.findUnique({ where: { email } }).catch(() => null)
            if (recovered) {
              user = await prisma.user.update({
                where: { id: recovered.id },
                data: { name: recovered.name || name, password: recovered.password || hashedPassword, role: 'AGENCY' },
              })
            } else {
              return NextResponse.json({ success: false, message: 'Registration failed. Please try again.' }, { status: 500 })
            }
          } else {
            throw createErr
          }
        }
      }

      // create agency profile if not exists
      if (!existingAgencyProfile && user) {
        try {
          await prisma.agencyProfile.create({
            data: {
              userId: user.id,
              agencyName: name,
              email: user.email,
              phone: phone || null,
              country: body?.country || null,
              city: body?.city || null,
              website: body?.website || null,
              licenseNumber: body?.licenseNumber || null,
              reraNumber: body?.reraNumber || null,
              agencySize: body?.agencySize || undefined,
              specializations: Array.isArray(body?.specializations) ? body.specializations : [],
            },
          })
        } catch (e: any) {
          // Ignore duplicate profile (P2002) — profile already exists
          if (e?.code !== 'P2002') {
            console.error('[register/agency] agencyProfile.create error:', e?.message)
          }
        }
      }

      await VerificationService.sendRegistrationOtp(email, 'agency', user!.name, ip)

      return NextResponse.json({ success: true, message: 'Registration successful. Please verify your email.', requiresVerification: true, redirectTo: `/agency/verify-otp?email=${encodeURIComponent(email)}` }, { status: 200 })
    }

    if (type === 'developer') {
      if (!password) {
        return NextResponse.json({ success: false, message: 'Password required' }, { status: 400 })
      }

      if (!isStrongPassword(password)) {
        return NextResponse.json(
          { success: false, message: 'Password must be at least 8 characters and include letters and numbers.' },
          { status: 400 }
        )
      }

      // Don't include developerProfile — may trigger schema mismatch errors
      const existingUser = await prisma.user.findUnique({ where: { email } }).catch((err: any) => {
        console.error('[register/developer] findUnique error:', err?.message)
        return null
      })
      if (existingUser) {
        const existingRole = String(existingUser.role || '').toUpperCase()
        if (existingRole !== 'DEVELOPER' && existingRole !== 'ADMIN') {
          return NextResponse.json(
            { success: false, message: `This email is already registered as a ${roleLabel(existingRole)}. Please use a different email.` },
            { status: 400 }
          )
        }
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      let user = existingUser
      if (existingUser) {
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: { name: existingUser.name || name, password: existingUser.password || hashedPassword, role: 'DEVELOPER' },
        })
      } else {
        try {
          user = await prisma.user.create({
            data: { name, email, password: hashedPassword, role: 'DEVELOPER', verified: false },
          })
        } catch (createErr: any) {
          if (createErr?.code === 'P2002') {
            const recovered = await prisma.user.findUnique({ where: { email } }).catch(() => null)
            if (recovered) {
              user = await prisma.user.update({
                where: { id: recovered.id },
                data: { name: recovered.name || name, password: recovered.password || hashedPassword, role: 'DEVELOPER' },
              })
            } else {
              return NextResponse.json({ success: false, message: 'Registration failed. Please try again.' }, { status: 500 })
            }
          } else {
            throw createErr
          }
        }
      }

      try {
        await prisma.developerProfile.create({ data: { userId: user!.id, companyName: name, phone: phone || null, website: body?.website || null } })
      } catch (e: any) {
        if (e?.code !== 'P2002') {
          console.error('[register/developer] developerProfile.create error:', e?.message)
        }
      }

      await VerificationService.sendRegistrationOtp(email, 'developer', user!.name, ip)

      return NextResponse.json({ success: true, message: 'Registration successful. Please verify your email.', requiresVerification: true, redirectTo: `/developer/verify-otp?email=${encodeURIComponent(email)}` }, { status: 200 })
    }

    return NextResponse.json({ success: false, message: 'Invalid user type' }, { status: 400 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
