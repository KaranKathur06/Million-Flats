import Image from 'next/image'

interface Agent {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  bio?: string
  propertiesSold?: number
}

export default function AgentCard({ agent }: { agent: Agent }) {
  if (!agent) return null

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-6">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
          {agent.avatar ? (
            <Image
              src={agent.avatar}
              alt={agent.name}
              width={64}
              height={64}
              className="object-cover"
            />
          ) : (
            <span className="text-2xl font-semibold text-gray-600">
              {agent.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h3 className="font-semibold text-dark-blue">{agent.name}</h3>
          <p className="text-sm text-gray-600">Listing Agent</p>
        </div>
      </div>
      {agent.bio && (
        <p className="text-gray-600 text-sm mb-4">{agent.bio}</p>
      )}
      {agent.propertiesSold && (
        <p className="text-sm text-gray-600 mb-4">
          {agent.propertiesSold} properties sold
        </p>
      )}
      <div className="space-y-2">
        <a
          href={`mailto:${agent.email}`}
          className="block text-sm text-dark-blue hover:underline"
        >
          {agent.email}
        </a>
        <a
          href={`tel:${agent.phone}`}
          className="block text-sm text-dark-blue hover:underline"
        >
          {agent.phone}
        </a>
      </div>
      <button className="mt-4 w-full bg-dark-blue text-white py-2 rounded-lg font-medium hover:bg-opacity-90 transition-colors">
        Contact Agent
      </button>
    </div>
  )
}

