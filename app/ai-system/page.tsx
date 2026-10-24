const demoLinks = [
  { name: 'AI Index', href: '/ai/index/demo' },
  { name: 'AI Pro', href: '/ai/pro/demo' },
  { name: 'AI Shield', href: '/ai/shield/demo' },
  { name: 'AI Title', href: '/ai/title/demo' },
  { name: 'AI View', href: '/ai/view/demo' },
]

export default function AISystemPage() {
  return (
    <div className="min-h-screen bg-slate-100 py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-6">
            AI System<sup>™</sup>
          </h1>

          <div className="space-y-3">
            {demoLinks.map((demo) => (
              <a
                key={demo.name}
                href={demo.href}
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 text-lg font-semibold text-slate-800 shadow-sm transition hover:border-[#d4af37] hover:bg-amber-50 hover:text-[#0a1628]"
              >
                {demo.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
