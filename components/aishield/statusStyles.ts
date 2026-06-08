export function getAiStatusStyles(label: string) {
  const l = label.toLowerCase()
  if (l.includes('great') || l.includes('below'))
    return { badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' }
  if (l.includes('fair'))
    return { badge: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' }
  if (l.includes('over'))
    return { badge: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' }
  if (l.includes('risk') || l.includes('suspicious'))
    return { badge: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500' }
  return { badge: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' }
}
