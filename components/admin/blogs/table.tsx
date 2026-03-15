import React from 'react'

interface Blog {
  id: string
  title: string
  slug: string
  category: { name: string; slug: string }
  author: { name: string; email: string; role: string }
  seoScore: number
  status: string
  publishAt?: string | Date
  createdAt?: string | Date
  updatedAt?: string | Date
  views: number
}

interface BlogTableProps {
  blogs: Blog[]
  isLoading: boolean
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export const BlogTable: React.FC<BlogTableProps> = ({ blogs, isLoading, onEdit, onDelete }) => {
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PUBLISHED':
        return 'bg-green-100 text-green-800'
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'SCHEDULED':
        return 'bg-amber-100 text-amber-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSEOScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500'
    if (score >= 50) return 'text-amber-500'
    return 'text-red-500'
  }

  const formatDate = (dateString?: string | Date) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="p-6 text-center text-gray-500">
          Loading blogs...
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Author
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wIDER">
              SEO Score
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Published
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Views
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {blogs.map((blog) => (
            <tr key={blog.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{blog.title}</div>
                <div className="text-sm text-gray-500 truncate max-w-xs">{blog.slug}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {blog.category.name}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{blog.author.name}</div>
                <div className="text-sm text-gray-500">{blog.author.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`text-lg font-bold ${getSEOScoreColor(blog.seoScore)}`}>
                  {blog.seoScore}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(blog.status)}`}>
                  {blog.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(blog.publishAt || blog.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {blog.views}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => onEdit(blog.id)}
                  className="text-blue-600 hover:text-blue-900 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(blog.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {blogs.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500">No blogs found. Create your first blog!</div>
        </div>
      )}
    </div>
  )
}