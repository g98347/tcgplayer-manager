import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, Zap } from 'lucide-react'
import api from '../api'
import { formatDate } from '../utils/dateFormat'
import { formatCurrency, formatPercent } from '../utils/numberFormat'
import { isDateInPeriod } from '../utils/periodFilter'

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingOrder, setEditingOrder] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await axios.get('/api/orders')
      setOrders(response.data)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (order) => {
    try {
      await axios.post('/api/orders', order)
      fetchOrders()
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding order:', error)
    }
  }

  const handleUpdate = async (id, order) => {
    try {
      await axios.put(`/api/orders/${id}`, order)
      fetchOrders()
      setEditingOrder(null)
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await axios.delete(`/api/orders/${id}`)
        fetchOrders()
      } catch (error) {
        console.error('Error deleting order:', error)
      }
    }
  }

  const handleAutoImport = async () => {
    try {
      const response = await axios.post('/api/auto-import/orders')
      const { message, files, totalAdded, totalUpdated, totalProcessed } = response.data
      let details = ''
      if (files && files.length > 0) {
        details = files.map(f => `\n${f.file} (${f.type}): Added ${f.added}, Updated ${f.updated}`).join('')
      }
      alert(`${message}\nTotal Added: ${totalAdded}\nTotal Updated: ${totalUpdated}\nTotal Processed: ${totalProcessed}${details}`)
      fetchOrders()
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message
      alert(`Error auto-importing orders: ${errorMessage}`)
    }
  }
  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading orders...</div>
  }

  const selectedPeriod = searchParams.get('period') || 'all'
  const filteredOrders = orders.filter(order => isDateInPeriod(order.order_date, selectedPeriod))

  console.log(`Total orders: ${orders.length}, Filtered orders: ${filteredOrders.length}, Period: ${selectedPeriod}`)
  console.log('Orders by source:', orders.reduce((acc, o) => {
    acc[o.source || 'manual'] = (acc[o.source || 'manual'] || 0) + 1
    return acc
  }, {}))

  const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0) - (order.refunded_amount || 0) + (order.refunded_fees || 0), 0)
  const totalFees = filteredOrders.reduce((sum, order) => sum + (order.tcgplayer_fee || 0) - (order.refunded_fees || 0), 0)
  const netAfterFees = totalRevenue - totalFees
  const averageOrder = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0
  const feeRate = totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0

  // Calculate average fee percentage by source
  const ebayOrders = filteredOrders.filter(o => o.source === 'ebay')
  const tcgOrders = filteredOrders.filter(o => o.source === 'tcgplayer')

  const ebayRevenue = ebayOrders.reduce((sum, order) => sum + (order.total_amount || 0) - (order.refunded_amount || 0) + (order.refunded_fees || 0), 0)
  const ebayFees = ebayOrders.reduce((sum, order) => sum + (order.tcgplayer_fee || 0) - (order.refunded_fees || 0), 0)
  const ebayFeeRate = ebayRevenue > 0 ? (ebayFees / ebayRevenue) * 100 : 0

  const tcgRevenue = tcgOrders.reduce((sum, order) => sum + (order.total_amount || 0) - (order.refunded_amount || 0) + (order.refunded_fees || 0), 0)
  const tcgFees = tcgOrders.reduce((sum, order) => sum + (order.tcgplayer_fee || 0) - (order.refunded_fees || 0), 0)
  const tcgFeeRate = tcgRevenue > 0 ? (tcgFees / tcgRevenue) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Orders</h2>
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
            Add Order
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

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Revenue</h3>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Fees</h3>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(totalFees)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Net After Fees</h3>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(netAfterFees)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Average Order</h3>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(averageOrder)}
          </p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Fee Rate</h3>
          <p className="text-3xl font-bold text-white">
            {formatPercent(feeRate)}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-blue-400">eBay: {formatPercent(ebayFeeRate)} ({ebayOrders.length})</p>
            <p className="text-xs text-purple-400">TCGPlayer: {formatPercent(tcgFeeRate)} ({tcgOrders.length})</p>
          </div>
        </div>
      </div>

      {showAddForm && (
        <OrderForm
          onSubmit={handleAdd}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="bg-gray-900 rounded-xl border border-gray-800 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order #</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Seller Fee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Refunded Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Refunded Fees</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-800">
                {editingOrder?.id === order.id ? (
                  <EditableOrderRow
                    order={order}
                    onSave={handleUpdate}
                    onCancel={() => setEditingOrder(null)}
                  />
                ) : (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{order.order_number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDate(order.order_date)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.source === 'ebay' ? 'bg-blue-900 text-blue-400' :
                        order.source === 'tcgplayer' ? 'bg-purple-900 text-purple-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {order.source || 'manual'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatCurrency(order.total_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">{formatCurrency(order.tcgplayer_fee)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">{order.refunded_amount > 0 ? formatCurrency(order.refunded_amount) : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">{order.refunded_fees > 0 ? formatCurrency(order.refunded_fees) : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status?.toLowerCase().includes('shipped') && !order.status?.toLowerCase().includes('transit') ? 'bg-green-900 text-green-400' :
                        order.status?.toLowerCase().includes('shipped in transit') ? 'bg-blue-900 text-blue-400' :
                        order.status?.toLowerCase().includes('paid') ? 'bg-green-900 text-green-400' :
                        order.status?.toLowerCase().includes('delivered') ? 'bg-green-900 text-green-400' :
                        order.status?.toLowerCase().includes('processing') ? 'bg-blue-900 text-blue-400' :
                        order.status?.toLowerCase().includes('cancelled') ? 'bg-red-900 text-red-400' :
                        order.status?.toLowerCase().includes('returned') ? 'bg-red-900 text-red-400' :
                        order.status?.toLowerCase().includes('pending') ? 'bg-yellow-900 text-yellow-400' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {order.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingOrder(order)}
                          className="p-1 hover:bg-gray-700 rounded text-gray-300"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(order.id)}
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
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                  No orders found. Add orders or import from TCGPlayer.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function OrderForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    order_number: '',
    order_date: '',
    buyer_name: '',
    total_amount: 0,
    tcgplayer_fee: 0,
    refunded_amount: 0,
    refunded_fees: 0,
    status: 'pending',
    items: [],
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-white mb-4">Add Order</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Order Number</label>
          <input
            type="text"
            required
            value={formData.order_number}
            onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Order Date</label>
          <input
            type="date"
            value={formData.order_date}
            onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="shipped in transit">Shipped In Transit</option>
            <option value="paid">Paid</option>
            <option value="completed - paid">Completed - Paid</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
            <option value="returned">Returned</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Total Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.total_amount}
            onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Seller Fee</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.tcgplayer_fee}
            onChange={(e) => setFormData({ ...formData, tcgplayer_fee: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Refunded Amount</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.refunded_amount}
            onChange={(e) => setFormData({ ...formData, refunded_amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Refunded Fees</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.refunded_fees}
            onChange={(e) => setFormData({ ...formData, refunded_fees: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-700 bg-gray-800 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="md:col-span-2 flex gap-3">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Order
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

function EditableOrderRow({ order, onSave, onCancel }) {
  const [formData, setFormData] = useState({ ...order })

  const handleSave = () => {
    onSave(order.id, formData)
  }

  return (
    <>
      <td className="px-6 py-4">
        <input
          type="text"
          value={formData.order_number || ''}
          onChange={(e) => setFormData({ ...formData, order_number: e.target.value })}
          className="w-32 px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="date"
          value={formData.order_date || ''}
          onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
          className="px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.total_amount}
          onChange={(e) => setFormData({ ...formData, total_amount: parseFloat(e.target.value) || 0 })}
          className="w-24 px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.tcgplayer_fee}
          onChange={(e) => setFormData({ ...formData, tcgplayer_fee: parseFloat(e.target.value) || 0 })}
          className="w-20 px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.refunded_amount}
          onChange={(e) => setFormData({ ...formData, refunded_amount: parseFloat(e.target.value) || 0 })}
          className="w-20 px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.refunded_fees}
          onChange={(e) => setFormData({ ...formData, refunded_fees: parseFloat(e.target.value) || 0 })}
          className="w-20 px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        />
      </td>
      <td className="px-6 py-4">
        <select
          value={formData.status || 'pending'}
          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          className="px-2 py-1 border border-gray-700 bg-gray-800 text-white rounded text-sm"
        >
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="shipped in transit">Shipped In Transit</option>
          <option value="paid">Paid</option>
          <option value="completed - paid">Completed - Paid</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="returned">Returned</option>
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

