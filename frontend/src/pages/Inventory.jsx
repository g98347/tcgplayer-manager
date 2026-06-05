import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Upload } from 'lucide-react'
import axios from 'axios'

export default function Inventory() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const response = await axios.get('/api/inventory')
      setInventory(response.data)
    } catch (error) {
      console.error('Error fetching inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (item) => {
    try {
      await axios.post('/api/inventory', item)
      fetchInventory()
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding item:', error)
    }
  }

  const handleUpdate = async (id, item) => {
    try {
      await axios.put(`/api/inventory/${id}`, item)
      fetchInventory()
      setEditingItem(null)
    } catch (error) {
      console.error('Error updating item:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await axios.delete(`/api/inventory/${id}`)
        fetchInventory()
      } catch (error) {
        console.error('Error deleting item:', error)
      }
    }
  }

  const handleCSVImport = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('/api/import/inventory', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      alert(`${response.data.message}\nAdded: ${response.data.added}\nUpdated: ${response.data.updated}\nTotal: ${response.data.total}`)
      fetchInventory()
      event.target.value = '' // Reset file input
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      alert(`Error importing inventory: ${errorMessage}`)
    }
  }
  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading inventory...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Inventory</h2>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer">
            <Upload className="w-4 h-4" />
            Import CSV
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              className="hidden"
            />
          </label>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {showAddForm && (
        <InventoryForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Set</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Condition</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Purchase Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">List Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {inventory.map((item) => (
              <tr key={item.id} className="hover:bg-gray-800">
                {editingItem?.id === item.id ? (
                  <EditableRow
                    item={item}
                    onSave={handleUpdate}
                    onCancel={() => setEditingItem(null)}
                  />
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.set_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{item.condition || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{item.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">${item.purchase_price?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">${item.list_price?.toFixed(2) || '0.00'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingItem(item)}
                          className="p-1 hover:bg-gray-700 rounded text-gray-300"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
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
            {inventory.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  No inventory items found. Add items or scrape from TCGPlayer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InventoryForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    set_name: '',
    condition: '',
    quantity: 0,
    purchase_price: 0,
    list_price: 0,
    tcgplayer_id: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-white mb-4">Add Inventory Item</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Set Name</label>
          <input
            type="text"
            value={formData.set_name}
            onChange={(e) => setFormData({ ...formData, set_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Condition</label>
          <input
            type="text"
            value={formData.condition}
            onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Quantity</label>
          <input
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Purchase Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.purchase_price}
            onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">List Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.list_price}
            onChange={(e) => setFormData({ ...formData, list_price: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Item
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

function EditableRow({ item, onSave, onCancel }) {
  const [formData, setFormData] = useState({ ...item })

  const handleSave = () => {
    onSave(item.id, formData)
  }

  return (
    <>
      <td className="px-6 py-4">
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="text"
          value={formData.set_name || ''}
          onChange={(e) => setFormData({ ...formData, set_name: e.target.value })}
          className="w-full px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="text"
          value={formData.condition || ''}
          onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
          className="w-full px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          min="0"
          value={formData.quantity}
          onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.purchase_price}
          onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.list_price}
          onChange={(e) => setFormData({ ...formData, list_price: parseFloat(e.target.value) || 0 })}
          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
        />
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

