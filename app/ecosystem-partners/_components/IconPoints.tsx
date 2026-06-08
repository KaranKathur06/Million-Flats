export default function IconPoints({
  title,
  points,
}: {
  title: string
  points: { heading: string; text: string }[]
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {points.map((p) => (
          <div key={p.heading} className="rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-900">{p.heading}</div>
            <div className="mt-1 text-sm text-gray-600">{p.text}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
