/** Join conditional class names (Tailwind-friendly). */
export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ')
}
