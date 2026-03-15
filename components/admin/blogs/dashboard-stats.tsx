import React from 'react'

interface BlogStatsProps {
  stats?: {
    totalBlogs: number
    publishedBlogs: number
    totalViews: number
    avgSeoScore: number
  }
}

export const BlogStats: React.FC<BlogStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Total Blogs',
      value: stats?.totalBlogs || 0,
      color: 'bg-blue-500',
      icon: '📝',
    },
    {
      title: 'Published',
      value: stats?.publishedBlogs || 0,
      color: 'bg-green-500',
      icon: '✅',
    },
    {
      title: 'Total Views',
      value: stats?.totalViews || 0,
      color: 'bg-purple-500',
      icon: '👀',
    },
    {
      title: 'Avg SEO Score',
      value: stats?.avgSeoScore ? `${Math.round(stats.avgSeoScore)}%` : '0%',
      color: 'bg-orange-500',
      icon: '📈',
    },
  ]

  return (
    <>
      {statCards.map((stat) => (
        <div key={stat.title} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-2xl`}>
              {stat.icon}
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </>
  )
}