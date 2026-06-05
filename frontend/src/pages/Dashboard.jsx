import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign, Package, ShoppingCart, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatDate } from '../utils/dateFormat'
import { formatCurrency } from '../utils/numberFormat'

export default function Dashboard() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState(null)
  const [timeSeriesData, setTimeSeriesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('all')

  useEffect(() => {
    fetchMetrics()
    fetchTimeSeriesData()
  }, [selectedPeriod])

  const fetchMetrics = async () => {
    try {
      const response = await axios.get(`/api/metrics/period?period=${selectedPeriod}`)
      setMetrics(response.data)
    } catch (error) {
      console.error('Error fetching metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTimeSeriesData = async () => {
    try {
      const response = await axios.get(`/api/metrics/time-series?period=${selectedPeriod}`)
      setTimeSeriesData(response.data)
    } catch (error) {
      console.error('Error fetching time series data:', error)
    }
  }

  const formatMonth = (monthStr) => {
    if (!monthStr) return ''
    const [year, month] = monthStr.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${monthNames[parseInt(month) - 1]} ${year}`
  }

  const formattedTimeSeriesData = timeSeriesData.map(item => ({
    ...item,
    month: formatMonth(item.month)
  }))

  const aggregateProfit = timeSeriesData.reduce((sum, item) => sum + (item.profit || 0), 0)
  const shouldShowAggregate = timeSeriesData.length > 0 && selectedPeriod !== 'this_month'

  const chartData = formattedTimeSeriesData.map(item => ({
    ...item,
    costs: (item.costs || 0) + (item.fees || 0),
    aggregateProfit: shouldShowAggregate ? aggregateProfit : null
  }))

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Loading metrics...</div>
  }

  const cards = [
    { title: 'Revenue', value: metrics?.revenue || 0, icon: DollarSign, color: 'green', average: metrics?.ordersCount > 0 ? metrics.revenue / metrics.ordersCount : 0, count: metrics?.ordersCount || 0, route: `/orders?period=${selectedPeriod}` },
    { title: 'Costs', value: (metrics?.cogs || 0) + (metrics?.tcgplayerFees || 0), icon: Package, color: 'red', average: null, count: null, route: `/costs?period=${selectedPeriod}` },
    { title: 'Profit', value: metrics?.profit || 0, icon: TrendingUp, color: metrics?.profit >= 0 ? 'green' : 'red', average: null, count: null },
    { title: 'Total ROI', value: metrics?.roi || 0, icon: TrendingUp, color: (metrics?.roi || 0) >= 0 ? 'green' : 'red', average: null, count: null, isPercent: true },
  ]

  const colorClasses = {
    green: 'bg-green-900/50 text-green-400 border-green-800',
    red: 'bg-red-900/50 text-red-400 border-red-800',
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="this_year">This Year</option>
            <option value="last_6_months">Last 6 Months</option>
            <option value="last_12_months">Last 12 Months</option>
          </select>
          <button
            onClick={() => { fetchMetrics(); fetchTimeSeriesData(); }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.title}
              onClick={() => card.route && navigate(card.route)}
              className={`bg-gray-900 rounded-xl border border-gray-800 p-5 shadow-lg hover:border-gray-700 transition-colors ${card.route ? 'cursor-pointer hover:bg-gray-800' : ''}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-lg ${colorClasses[card.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {card.value >= 0 ? (
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                )}
              </div>
              <h3 className="text-xs font-medium text-gray-400 mb-1 uppercase tracking-wide">{card.title}</h3>
              <p className="text-2xl font-bold text-white">
                {card.isPercent ? `${card.value.toFixed(2)}%` : formatCurrency(card.value)}
              </p>
              {card.average !== null && card.average !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Avg: {formatCurrency(card.average)} ({card.count})
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6">Revenue, Costs & Profit Over Time</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="month" 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <YAxis 
              stroke="#9CA3AF"
              fontSize={12}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: '#374151', borderRadius: '8px' }}
              itemStyle={{ color: '#F3F4F6' }}
              formatter={(value) => formatCurrency(value)}
              cursor={{ fill: 'transparent' }}
            />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} name="Revenue" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="costs" stroke="#EF4444" strokeWidth={3} name="Costs" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="profit" stroke="#3B82F6" strokeWidth={3} name="Profit" dot={{ r: 4 }} />
            {shouldShowAggregate && (
              <Line type="monotone" dataKey="aggregateProfit" stroke="#F59E0B" strokeWidth={2} strokeDasharray="6 6" name="Aggregate Profit" dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Inventory Summary</h3>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-900/30 rounded-xl">
              <Package className="w-10 h-10 text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{metrics?.inventoryCount || 0}</p>
              <p className="text-sm text-gray-400">Total Items</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-4">Orders Summary</h3>
          <div className="flex items-center gap-4">
            <div className="p-4 bg-purple-900/30 rounded-xl">
              <ShoppingCart className="w-10 h-10 text-purple-400" />
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{metrics?.ordersCount || 0}</p>
              <p className="text-sm text-gray-400">Total Orders</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
