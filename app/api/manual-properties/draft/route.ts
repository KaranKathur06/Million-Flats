import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const mod = await import('../route')
  return mod.POST()
}
