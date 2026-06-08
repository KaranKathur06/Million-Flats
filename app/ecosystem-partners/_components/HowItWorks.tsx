export default function HowItWorks({
  steps,
}: {
  steps: { title: string; text: string }[]
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-xl font-semibold text-gray-900">How It Works</h3>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((s, idx) => (
          <div key={s.title} className="rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-bold text-gray-500">Step {idx + 1}</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{s.title}</div>
            <div className="mt-1 text-sm text-gray-600">{s.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
