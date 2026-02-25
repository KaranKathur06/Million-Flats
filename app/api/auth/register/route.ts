import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mailer'
import { parsePhoneNumberFromString } from 'libphonenumber-js'

export const runtime = 'nodejs'

function safeString(v: unknown) {
  if (typeof v !== 'string') return ''
  return v.trim()
}

function roleLabel(role: string) {
  const normalized = String(role || '').toUpperCase()
  if (normalized === 'AGENT') return 'Agent'
  return 'User'
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

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
            const otp = generateOtp()
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

            await prisma.emailVerificationToken.deleteMany({ where: { userId: updated.id } })
            await prisma.emailVerificationToken.create({
              data: {
                userId: updated.id,
                token: otp,
                expiresAt,
              },
            })

            await sendEmail({
              to: email,
              subject: 'Your MillionFlats verification code',
              html: `<p>Your verification code is:</p><p style="font-size:24px;letter-spacing:4px;"><strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
            }).catch(() => null)

            return NextResponse.json(
              {
                success: true,
                message: 'Password set successfully. Please verify your email.',
                requiresVerification: true,
              },
              { status: 200 }
            )
          }

          return NextResponse.json({ success: true, message: 'Password set successfully' }, { status: 200 })
        }

        const isValidPassword = await bcrypt.compare(password, existingUser.password)
        if (!isValidPassword) {
          return NextResponse.json({ success: false, message: 'Invalid credentials' }, { status: 401 })
        }

        if (!existingUser.verified) {
          const otp = generateOtp()
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

          await prisma.emailVerificationToken.deleteMany({ where: { userId: existingUser.id } })
          await prisma.emailVerificationToken.create({
            data: {
              userId: existingUser.id,
              token: otp,
              expiresAt,
            },
          })

          await sendEmail({
            to: email,
            subject: 'Your MillionFlats verification code',
            html: `<p>Your verification code is:</p><p style="font-size:24px;letter-spacing:4px;"><strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
          }).catch(() => null)

          return NextResponse.json(
            {
              success: true,
              message: 'OTP sent to your email',
              requiresVerification: true,
            },
            { status: 200 }
          )
        }

        return NextResponse.json({ success: true, message: 'Account already exists. Please sign in.' }, { status: 200 })
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

      const otp = generateOtp()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: otp,
          expiresAt,
        },
      })

      await sendEmail({
        to: email,
        subject: 'Your MillionFlats verification code',
        html: `<p>Your verification code is:</p><p style="font-size:24px;letter-spacing:4px;"><strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      }).catch(() => null)

      return NextResponse.json(
        {
          success: true,
          message: 'Registration successful. Please verify your email.',
          requiresVerification: true,
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

      const otp = generateOtp()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      await prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } })
      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: otp,
          expiresAt,
        },
      })

      await sendEmail({
        to: email,
        subject: 'Your MillionFlats verification code',
        html: `<p>Your verification code is:</p><p style="font-size:24px;letter-spacing:4px;"><strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
      }).catch(() => null)

      return NextResponse.json(
        {
          success: true,
          message: 'Registration successful. Please verify your email.',
          requiresVerification: true,
        },
        { status: 200 }
      )
    }

    return NextResponse.json({ success: false, message: 'Invalid user type' }, { status: 400 })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 })
  }
}
