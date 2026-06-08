export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="mx-auto max-w-xl px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8">
          <h1 className="text-2xl font-serif font-bold text-dark-blue">Account Suspended</h1>
          <p className="mt-4 text-gray-700">
            Your account is currently suspended. Please contact support if you believe this is a mistake.
          </p>
        </div>
      </div>
    </div>
  )
}
