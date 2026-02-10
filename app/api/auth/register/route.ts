import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mailer'

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)

    const name = safeString(body?.name)
    const email = safeString(body?.email).toLowerCase()
    const password = safeString(body?.password)
    const phone = safeString(body?.phone)
    const license = safeString(body?.license)
    const company = safeString(body?.company)
    const type = safeString(body?.type)

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
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: phone || null,
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
      if (!password || !license) {
        return NextResponse.json({ success: false, message: 'Missing required fields for agent' }, { status: 400 })
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
        ? await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: existingUser.name || name,
              password: existingUser.password || hashedPassword,
              phone: existingUser.phone || phone || null,
              role: 'AGENT',
            },
          })
        : await prisma.user.create({
            data: {
              name,
              email,
              password: hashedPassword,
              phone: phone || null,
              role: 'AGENT',
              verified: true,
            },
          })

      if (!existingUser?.agent) {
        await prisma.agent.create({
          data: {
            userId: user.id,
            company: company || null,
            license,
            whatsapp: null,
            approved: false,
            profileStatus: 'DRAFT',
          } as any,
        })
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Agent registration successful. Please login.',
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
