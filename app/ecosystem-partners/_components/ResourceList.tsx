export default function ResourceList({
  title,
  items,
}: {
  title: string
  items: { title: string; description: string }[]
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((i) => (
          <div key={i.title} className="rounded-xl border border-gray-200 p-4">
            <div className="text-sm font-semibold text-gray-900">{i.title}</div>
            <div className="mt-1 text-sm text-gray-600">{i.description}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
