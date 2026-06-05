import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Save, Percent, DollarSign } from 'lucide-react'
import api from '../api'

export default function Settings() {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingSetting, setEditingSetting] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  // eBay fee settings
  const [ebayFeePercentage, setEbayFeePercentage] = useState('13.6')
  const [ebayFeeFixed, setEbayFeeFixed] = useState('0.30')

  // TCGPlayer fee settings
  const [tcgFeePercentage, setTcgFeePercentage] = useState('12.95')
  const [tcgFeeFixed, setTcgFeeFixed] = useState('0.00')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings')
      setSettings(response.data)

      // Load eBay fee settings
      const feePercent = response.data.find(s => s.key === 'ebay_fee_percentage')
      const feeFixed = response.data.find(s => s.key === 'ebay_fee_fixed')
      if (feePercent) setEbayFeePercentage(feePercent.value)
      if (feeFixed) setEbayFeeFixed(feeFixed.value)

      // Load TCGPlayer fee settings
      const tcgFeePercent = response.data.find(s => s.key === 'tcgplayer_fee_percentage')
      const tcgFeeFixed = response.data.find(s => s.key === 'tcgplayer_fee_fixed')
      if (tcgFeePercent) setTcgFeePercentage(tcgFeePercent.value)
      if (tcgFeeFixed) setTcgFeeFixed(tcgFeeFixed.value)
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (setting) => {
    try {
      await axios.post('/api/settings', setting)
      fetchSettings()
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding setting:', error)
    }
  }

  const handleUpdate = async (id, setting) => {
    try {
      await axios.put(`/api/settings/${id}`, setting)
      fetchSettings()
      setEditingSetting(null)
    } catch (error) {
      console.error('Error updating setting:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this setting?')) {
      try {
        await axios.delete(`/api/settings/${id}`)
        fetchSettings()
      } catch (error) {
        console.error('Error deleting setting:', error)
      }
    }
  }

  const handleSaveEbayFees = async () => {
    try {
      const feePercent = settings.find(s => s.key === 'ebay_fee_percentage')
      const feeFixed = settings.find(s => s.key === 'ebay_fee_fixed')

      if (feePercent) {
        await axios.put(`/api/settings/${feePercent.id}`, {
          key: 'ebay_fee_percentage',
          value: ebayFeePercentage,
          description: 'eBay fee percentage rate'
        })
      } else {
        await axios.post('/api/settings', {
          key: 'ebay_fee_percentage',
          value: ebayFeePercentage,
          description: 'eBay fee percentage rate'
        })
      }

      if (feeFixed) {
        await axios.put(`/api/settings/${feeFixed.id}`, {
          key: 'ebay_fee_fixed',
          value: ebayFeeFixed,
          description: 'eBay fixed fee amount'
        })
      } else {
        await axios.post('/api/settings', {
          key: 'ebay_fee_fixed',
          value: ebayFeeFixed,
          description: 'eBay fixed fee amount'
        })
      }

      fetchSettings()
      alert('eBay fee settings saved successfully')
    } catch (error) {
      console.error('Error saving eBay fee settings:', error)
      alert('Error saving eBay fee settings')
    }
  }

  const handleSaveTcgFees = async () => {
    try {
      const feePercent = settings.find(s => s.key === 'tcgplayer_fee_percentage')
      const feeFixed = settings.find(s => s.key === 'tcgplayer_fee_fixed')

      if (feePercent) {
        await axios.put(`/api/settings/${feePercent.id}`, {
          key: 'tcgplayer_fee_percentage',
          value: tcgFeePercentage,
          description: 'TCGPlayer fee percentage rate'
        })
      } else {
        await axios.post('/api/settings', {
          key: 'tcgplayer_fee_percentage',
          value: tcgFeePercentage,
          description: 'TCGPlayer fee percentage rate'
        })
      }

      if (feeFixed) {
        await axios.put(`/api/settings/${feeFixed.id}`, {
          key: 'tcgplayer_fee_fixed',
          value: tcgFeeFixed,
          description: 'TCGPlayer fixed fee amount'
        })
      } else {
        await axios.post('/api/settings', {
          key: 'tcgplayer_fee_fixed',
          value: tcgFeeFixed,
          description: 'TCGPlayer fixed fee amount'
        })
      }

      fetchSettings()
      alert('TCGPlayer fee settings saved successfully')
    } catch (error) {
      console.error('Error saving TCGPlayer fee settings:', error)
      alert('Error saving TCGPlayer fee settings')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Settings</h2>

      {/* eBay Fee Settings */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-lg p-6 border border-blue-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign size={20} />
          eBay Fee Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1 flex items-center gap-2">
              <Percent size={16} />
              Fee Percentage
            </label>
            <input
              type="number"
              step="0.1"
              value={ebayFeePercentage}
              onChange={(e) => setEbayFeePercentage(e.target.value)}
              className="w-full bg-blue-950 border border-blue-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="13.6"
            />
            <p className="text-xs text-blue-300 mt-1">Percentage of total order amount</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-200 mb-1 flex items-center gap-2">
              <DollarSign size={16} />
              Fixed Fee
            </label>
            <input
              type="number"
              step="0.01"
              value={ebayFeeFixed}
              onChange={(e) => setEbayFeeFixed(e.target.value)}
              className="w-full bg-blue-950 border border-blue-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.30"
            />
            <p className="text-xs text-blue-300 mt-1">Fixed fee per transaction</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-blue-200">
            Formula: (Total × {ebayFeePercentage}%) + ${ebayFeeFixed}
          </p>
          <button
            onClick={handleSaveEbayFees}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Save size={18} />
            Save eBay Fees
          </button>
        </div>
      </div>

      {/* TCGPlayer Fee Settings */}
      <div className="bg-gradient-to-r from-purple-900 to-purple-800 rounded-lg p-6 border border-purple-700">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <DollarSign size={20} />
          TCGPlayer Fee Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1 flex items-center gap-2">
              <Percent size={16} />
              Fee Percentage
            </label>
            <input
              type="number"
              step="0.1"
              value={tcgFeePercentage}
              onChange={(e) => setTcgFeePercentage(e.target.value)}
              className="w-full bg-purple-950 border border-purple-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="12.95"
            />
            <p className="text-xs text-purple-300 mt-1">Percentage of total order amount</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-200 mb-1 flex items-center gap-2">
              <DollarSign size={16} />
              Fixed Fee
            </label>
            <input
              type="number"
              step="0.01"
              value={tcgFeeFixed}
              onChange={(e) => setTcgFeeFixed(e.target.value)}
              className="w-full bg-purple-950 border border-purple-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0.00"
            />
            <p className="text-xs text-purple-300 mt-1">Fixed fee per transaction</p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-purple-200">
            Formula: (Total × {tcgFeePercentage}%) + ${tcgFeeFixed}
          </p>
          <button
            onClick={handleSaveTcgFees}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
          >
            <Save size={18} />
            Save TCGPlayer Fees
          </button>
        </div>
      </div>

      {/* Other Settings */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">All Settings</h3>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition text-sm"
          >
            <Plus size={16} />
            Add Setting
          </button>
        </div>

        {showAddForm && (
          <div className="p-6 border-b border-gray-700">
            <SettingForm
              onSubmit={handleAdd}
              onCancel={() => setShowAddForm(false)}
            />
          </div>
        )}

        <div className="overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {settings
                .filter(s =>
                  s.key !== 'ebay_fee_percentage' &&
                  s.key !== 'ebay_fee_fixed' &&
                  s.key !== 'tcgplayer_fee_percentage' &&
                  s.key !== 'tcgplayer_fee_fixed'
                )
                .map((setting) => (
                <tr key={setting.id} className="hover:bg-gray-750">
                  {editingSetting?.id === setting.id ? (
                    <td colSpan={5} className="px-6 py-4">
                      <SettingForm
                        setting={setting}
                        onSubmit={(data) => handleUpdate(setting.id, data)}
                        onCancel={() => setEditingSetting(null)}
                      />
                    </td>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">{setting.key}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-mono">{setting.value}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{setting.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(setting.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setEditingSetting(setting)}
                          className="text-blue-400 hover:text-blue-300 mr-3"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(setting.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {settings.filter(s =>
                s.key !== 'ebay_fee_percentage' &&
                s.key !== 'ebay_fee_fixed' &&
                s.key !== 'tcgplayer_fee_percentage' &&
                s.key !== 'tcgplayer_fee_fixed'
              ).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    No custom settings found. Add your first setting to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SettingForm({ setting, onSubmit, onCancel }) {
  const [key, setKey] = useState(setting?.key || '')
  const [value, setValue] = useState(setting?.value || '')
  const [description, setDescription] = useState(setting?.description || '')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ key, value, description })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Key</label>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., custom_setting"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Value</label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., value"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g., Description of this setting"
        />
      </div>
      <div className="flex gap-3">
        <button
          type="submit"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Save size={18} />
          {setting ? 'Update' : 'Add'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
