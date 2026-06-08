import type { NextApiRequest, NextApiResponse } from 'next'
import { serialize } from 'cookie'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string; token?: string; requiresVerification?: boolean }>
) {
  res.setHeader(
    'Set-Cookie',
    serialize('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    })
  )

  return res.status(410).json({ success: false, message: 'Legacy auth is disabled. Please use NextAuth login.' })
}

