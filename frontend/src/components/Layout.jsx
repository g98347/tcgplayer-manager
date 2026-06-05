import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, DollarSign, Menu, Settings as SettingsIcon } from 'lucide-react'
import { useState } from 'react'

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/inventory', label: 'Inventory', icon: Package },
    { path: '/orders', label: 'Orders', icon: ShoppingCart },
    { path: '/costs', label: 'COGS', icon: DollarSign },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-800 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-300"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold text-white">TCGPlayer Manager</h1>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside
          className={`fixed left-0 top-16 bottom-0 bg-gray-900 border-r border-gray-800 transition-all duration-300 ${
            sidebarOpen ? 'w-64' : 'w-0'
          } overflow-hidden`}
        >
          <div className="p-4 space-y-6">
            <div>
              <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Operations</p>
            <ul className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
            </div>

            <div>
              <p className="px-4 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Admin</p>
              <Link
                to="/settings"
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === '/settings'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <SettingsIcon className="w-5 h-5" />
                Settings
              </Link>
            </div>
          </div>
        </aside>

        <main
          className={`flex-1 p-6 transition-all duration-300 ${
            sidebarOpen ? 'ml-64' : 'ml-0'
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  )
}

