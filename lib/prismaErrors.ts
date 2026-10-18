export function isPrismaPoolTimeout(error: unknown): boolean {
  return error instanceof Error &&
    error.name === 'PrismaClientKnownRequestError' &&
    'clientVersion' in error &&
    typeof error.clientVersion === 'string' &&
    'code' in error &&
    error.code === 'P2024'
}
