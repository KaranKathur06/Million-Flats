import React, { useState } from 'react'
import SelectDropdown from '@/components/SelectDropdown'

interface BlogFilterProps {
  currentFilters: {
    category?: string
    status?: string
    author?: string
  }
}

export const BlogFilter: React.FC<BlogFilterProps> = ({ currentFilters }) => {
  const [filters, setFilters] = useState({
    category: currentFilters.category || '',
    status: currentFilters.status || '',
    author: currentFilters.author || '',
    search: '',
  })

  const handleFilterChange = (name: string, value: string) => {
    setFilters((prev) => ({ ...prev, [name]: value }))

    const query = new URLSearchParams(window.location.search)
    query.set(name, value)
    window.location.search = query.toString()
  }

  const handleClear = () => {
    setFilters({
      category: '',
      status: '',
      author: '',
      search: '',
    })
    window.location.search = ''
  }

  const categories = [
    { id: 'tech', name: 'Technology' },
    { id: 'business', name: 'Business' },
    { id: 'lifestyle', name: 'Lifestyle' },
    { id: 'health', name: 'Health' },
    { id: 'education', name: 'Education' },
    { id: 'entertainment', name: 'Entertainment' },
  ]

  const statuses = ['Draft', 'Published', 'Scheduled']

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Filters</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <SelectDropdown
            name="category"
            label="Category"
            value={filters.category}
            onChange={(value) => handleFilterChange('category', value)}
            options={[{ value: '', label: 'All Categories' }, ...categories.map((cat) => ({ value: cat.id, label: cat.name }))]}
            showLabel={false}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <SelectDropdown
            name="status"
            label="Status"
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
            options={[{ value: '', label: 'All Status' }, ...statuses.map((status) => ({ value: status.toUpperCase(), label: status }))]}
            showLabel={false}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input
            type="text"
            name="search"
            value={filters.search}
            onChange={(e) => handleFilterChange(e.target.name, e.target.value)}
            placeholder="Search by title, content, or author..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <button
            onClick={handleClear}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 text-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>
    </div>
  )
}
