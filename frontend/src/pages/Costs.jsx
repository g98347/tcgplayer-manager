import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Zap } from 'lucide-react'
import axios from 'axios'
import { formatDate } from '../utils/dateFormat'
import { formatCurrency } from '../utils/numberFormat'
import { isDateInPeriod } from '../utils/periodFilter'

export default function Costs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [costs, setCosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingCost, setEditingCost] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchCosts()
  }, [])

  const fetchCosts = async () => {
    try {
      const response = await axios.get('/api/costs')
      setCosts(response.data)
    } catch (error) {
      console.error('Error fetching costs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (cost) => {
    try {
      await axios.post('/api/costs', cost)
      fetchCosts()
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding cost:', error)
    }
  }

  const handleUpdate = async (id, cost) => {
    try {
      await axios.put(`/api/costs/${id}`, cost)
      fetchCosts()
      setEditingCost(null)
    } catch (error) {
      console.error('Error updating cost:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this cost?')) {
      try {
        await axios.delete(`/api/costs/${id}`)
        fetchCosts()
      } catch (error) {
        console.error('Error deleting cost:', error)
      }
    }
  }

  const handleAutoImport = async () => {
    try {
      const response = await axios.post('/api/auto-import/costs')
      alert(`${response.data.message}\nAdded: ${response.data.added}\nUpdated: ${response.data.updated}\nSkipped (payment types/no label): ${response.data.skipped}\nTotal: ${response.data.total}`)
      fetchCosts()
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      alert(`Error auto-importing costs: ${errorMessage}`)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading costs...</div>
  }

  const selectedPeriod = searchParams.get('period') || 'all'
  const filteredCosts = costs.filter(cost => isDateInPeriod(cost.date, selectedPeriod))
  const totalCosts = filteredCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0)
  const averageCost = filteredCosts.length > 0 ? totalCosts / filteredCosts.length : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">COGS (Cost of Goods Sold)</h2>
        <div className="flex gap-3">
          <button
            onClick={handleAutoImport}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            title="Auto-import from Downloads folder"
          >
            <Zap className="w-4 h-4" />
            Auto Import
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add COGS Entry
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Period</label>
        <select
          value={selectedPeriod}
          onChange={(e) => setSearchParams(e.target.value === 'all' ? {} : { period: e.target.value })}
          className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Time</option>
          <option value="this_month">This Month</option>
          <option value="this_year">This Year</option>
          <option value="last_6_months">Last 6 Months</option>
          <option value="last_12_months">Last 12 Months</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Costs</h3>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(totalCosts)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Average Transaction</h3>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(averageCost)}
          </p>
        </div>
      </div>

      {showAddForm && (
        <CostForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cost Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredCosts.map((cost) => (
              <tr key={cost.id} className="hover:bg-gray-800">
                {editingCost?.id === cost.id ? (
                  <EditableCostRow
                    cost={cost}
                    onSave={handleUpdate}
                    onCancel={() => setEditingCost(null)}
                  />
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDate(cost.date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatCurrency(cost.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{cost.description || cost.category || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 capitalize">{cost.cost_type || 'operating'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingCost(cost)}
                          className="p-1 hover:bg-gray-700 rounded text-gray-300"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cost.id)}
                          className="p-1 hover:bg-red-900 rounded text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
            {filteredCosts.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  No COGS entries found. Add entries to track your cost of goods sold.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CostForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    category: 'COGS',
    description: '',
    amount: 0,
    cost_type: 'operating',
    date: new Date().toISOString().split('T')[0],
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-white mb-4">Add COGS Entry</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Amount ($)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            required
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="5.00"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <input
            type="text"
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Shipping materials, Card sleeves, Toploaders"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Cost Type</label>
          <select
            value={formData.cost_type}
            onChange={(e) => setFormData({ ...formData, cost_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="operating">Operating</option>
            <option value="capital">Capital</option>
          </select>
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add COGS Entry
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function EditableCostRow({ cost, onSave, onCancel }) {
  const [formData, setFormData] = useState({ ...cost })

  const handleSave = () => {
    onSave(cost.id, formData)
  }

  return (
    <>
      <td className="px-6 py-4">
        <input
          type="date"
          value={formData.date || ''}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          className="w-24 px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="text"
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-48 px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <select
          value={formData.cost_type || 'operating'}
          onChange={(e) => setFormData({ ...formData, cost_type: e.target.value })}
          className="px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        >
          <option value="operating">Operating</option>
          <option value="capital">Capital</option>
        </select>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
          >
            Save
          </button>
          <button
            onClick={onCancel}
            className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </td>
    </>
  )
}
