import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ success: boolean; message: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  try {
    const { name, email, subject, message } = req.body

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Missing required fields' })
    }

    // In production, send email using nodemailer or similar service
    console.log('Contact form submission:', { name, email, subject, message })

    return res.status(200).json({
      success: true,
      message: 'Thank you for your message. We will get back to you soon.',
    })
  } catch (error) {
    console.error('Contact form error:', error)
    return res.status(500).json({ success: false, message: 'Internal server error' })
  }
}

