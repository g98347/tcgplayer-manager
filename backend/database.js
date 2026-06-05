const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    const dbPath = path.join(__dirname, 'tcgplayer-manager.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
    this.dbPath = dbPath;
  }

  createBackup() {
    return new Promise((resolve, reject) => {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(__dirname, `backups/tcgplayer-manager-backup-${timestamp}.db`);
      
      const backupDir = path.join(__dirname, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      fs.copyFile(this.dbPath, backupPath, (err) => {
        if (err) {
          console.error('Error creating backup:', err);
          reject(err);
        } else {
          console.log(`Database backup created: ${backupPath}`);
          resolve(backupPath);
        }
      });
    });
  }

  initialize() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        set_name TEXT,
        condition TEXT,
        quantity INTEGER DEFAULT 0,
        purchase_price REAL DEFAULT 0,
        list_price REAL DEFAULT 0,
        tcgplayer_id TEXT,
        last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE,
        order_date TEXT,
        buyer_name TEXT,
        total_amount REAL DEFAULT 0,
        shipping_cost REAL DEFAULT 0,
        tcgplayer_fee REAL DEFAULT 0,
        refunded_amount REAL DEFAULT 0,
        refunded_fees REAL DEFAULT 0,
        status TEXT DEFAULT 'pending',
        source TEXT DEFAULT 'manual',
        items TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        description TEXT,
        amount REAL DEFAULT 0,
        cost_type TEXT DEFAULT 'operating',
        date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Error creating tables:', err);
      } else {
        console.log('Database initialized successfully');
      }
    });
    this.db.run(`ALTER TABLE costs ADD COLUMN cost_type TEXT DEFAULT 'operating'`, () => {});
    this.db.run(`ALTER TABLE orders ADD COLUMN refunded_amount REAL DEFAULT 0`, () => {});
    this.db.run(`ALTER TABLE orders ADD COLUMN refunded_fees REAL DEFAULT 0`, () => {});
    this.db.run(`ALTER TABLE orders ADD COLUMN source TEXT DEFAULT 'manual'`, () => {});
  }

  // Inventory methods
  getInventory() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM inventory ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  addInventoryItem(item) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO inventory (name, set_name, condition, quantity, purchase_price, list_price, tcgplayer_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        item.name,
        item.set_name || null,
        item.condition || null,
        item.quantity || 0,
        item.purchase_price || 0,
        item.list_price || 0,
        item.tcgplayer_id || null,
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
      stmt.finalize();
    });
  }

  updateInventoryItem(id, item) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE inventory 
        SET name = ?, set_name = ?, condition = ?, quantity = ?, 
            purchase_price = ?, list_price = ?, tcgplayer_id = ?, last_updated = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(
        item.name,
        item.set_name || null,
        item.condition || null,
        item.quantity || 0,
        item.purchase_price || 0,
        item.list_price || 0,
        item.tcgplayer_id || null,
        id,
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
      stmt.finalize();
    });
  }

  deleteInventoryItem(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM inventory WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Orders methods
  getOrders() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM orders ORDER BY order_date DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  addOrder(order) {
    return new Promise((resolve, reject) => {
      const normalizedDate = this.parseDate(order.order_date);
      const stmt = this.db.prepare(`
        INSERT INTO orders (order_number, order_date, buyer_name, total_amount, shipping_cost, tcgplayer_fee, refunded_amount, refunded_fees, status, source, items)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        order.order_number,
        normalizedDate,
        order.buyer_name || null,
        order.total_amount || 0,
        order.shipping_cost || 0,
        order.tcgplayer_fee || 0,
        order.refunded_amount || 0,
        order.refunded_fees || 0,
        order.status || 'pending',
        order.source || 'manual',
        JSON.stringify(order.items || []),
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
      stmt.finalize();
    });
  }

  updateOrder(id, order) {
    return new Promise((resolve, reject) => {
      const normalizedDate = this.parseDate(order.order_date);
      const stmt = this.db.prepare(`
        UPDATE orders 
        SET order_number = ?, order_date = ?, buyer_name = ?, total_amount = ?, 
            shipping_cost = ?, tcgplayer_fee = ?, refunded_amount = ?, refunded_fees = ?, status = ?, source = ?, items = ?
        WHERE id = ?
      `);
      stmt.run(
        order.order_number,
        normalizedDate,
        order.buyer_name || null,
        order.total_amount || 0,
        order.shipping_cost || 0,
        order.tcgplayer_fee || 0,
        order.refunded_amount || 0,
        order.refunded_fees || 0,
        order.status || 'pending',
        order.source || 'manual',
        JSON.stringify(order.items || []),
        id,
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
      stmt.finalize();
    });
  }

  deleteOrder(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM orders WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Settings methods
  getSettings() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM settings ORDER BY key', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getSetting(key) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM settings WHERE key = ?', [key], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  setSetting(key, value, description = null) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO settings (key, value, description, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          description = excluded.description,
          updated_at = CURRENT_TIMESTAMP
      `);
      stmt.run(key, value, description, function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
      stmt.finalize();
    });
  }

  updateSetting(id, key, value, description) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        UPDATE settings
        SET key = ?, value = ?, description = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(key, value, description, id, function(err) {
        if (err) reject(err);
        else resolve();
      });
      stmt.finalize();
    });
  }

  deleteSetting(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM settings WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Costs methods
  getCosts() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM costs ORDER BY date DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  addCost(cost) {
    return new Promise((resolve, reject) => {
      const normalizedDate = this.parseDate(cost.date);
      const stmt = this.db.prepare(`
        INSERT INTO costs (category, description, amount, cost_type, date)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(
        cost.category,
        cost.description || null,
        cost.amount || 0,
        cost.cost_type || 'operating',
        normalizedDate,
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
      stmt.finalize();
    });
  }

  updateCost(id, cost) {
    return new Promise((resolve, reject) => {
      const normalizedDate = this.parseDate(cost.date);
      const stmt = this.db.prepare(`
        UPDATE costs 
        SET category = ?, description = ?, amount = ?, cost_type = ?, date = ?
        WHERE id = ?
      `);
      stmt.run(
        cost.category,
        cost.description || null,
        cost.amount || 0,
        cost.cost_type || 'operating',
        normalizedDate,
        id,
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
      stmt.finalize();
    });
  }

  deleteCost(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM costs WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // Metrics methods
  getMetricsWithPeriod(period = 'all') {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM orders', (err, orders) => {
        if (err) {
          reject(err);
          return;
        }
        this.db.all('SELECT * FROM costs', (err, costs) => {
          if (err) {
            reject(err);
            return;
          }
          this.db.get('SELECT COALESCE(SUM(purchase_price * quantity), 0) as total, COUNT(*) as count FROM inventory', (err, inventoryRow) => {
            if (err) {
              reject(err);
              return;
            }
            const filteredOrders = orders.filter(order => this.isDateInPeriod(order.order_date, period));
            const filteredCosts = costs.filter(cost => this.isDateInPeriod(cost.date, period));
            const revenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0) - (order.refunded_amount || 0) + (order.refunded_fees || 0), 0);
            const fees = filteredOrders.reduce((sum, order) => sum + (order.tcgplayer_fee || 0) - (order.refunded_fees || 0), 0);
            const costsCOGS = filteredCosts.reduce((sum, cost) => sum + (cost.amount || 0), 0);
            const inventoryCOGS = inventoryRow.total || 0;
            const cogs = inventoryCOGS + costsCOGS;
            const totalCosts = cogs + fees;
            const profit = revenue - totalCosts;
            const roi = totalCosts > 0 ? (profit / totalCosts) * 100 : 0;
            resolve({
              revenue: parseFloat(revenue.toFixed(2)),
              cogs: parseFloat(cogs.toFixed(2)),
              otherCosts: 0,
              tcgplayerFees: parseFloat(fees.toFixed(2)),
              shippingCosts: 0,
              profit: parseFloat(profit.toFixed(2)),
              roi: parseFloat(roi.toFixed(2)),
              inventoryCount: inventoryRow.count || 0,
              ordersCount: filteredOrders.length,
              costsCount: filteredCosts.length
            });
          });
        });
      });
    });
  }

  // Helper function to parse date from various formats to YYYY-MM-DD
  parseDate(dateStr) {
    if (!dateStr) return null;
    const value = String(dateStr).trim();
    const embeddedIso = value.match(/(\d{4}-\d{2}-\d{2})/);
    if (embeddedIso) return embeddedIso[1];
    const slashDate = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (slashDate) {
      const month = slashDate[1].padStart(2, '0');
      const day = slashDate[2].padStart(2, '0');
      const year = slashDate[3].length === 2 ? `20${slashDate[3]}` : slashDate[3];
      return `${year}-${month}-${day}`;
    }
    
    // Try to parse different date formats
    // Format: "Thursday, 21 May 2026"
    const dayNameMonthFormat = /(\w+),\s+(\d+)\s+(\w+)\s+(\d+)/i;
    const match = value.match(dayNameMonthFormat);
    if (match) {
      const months = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      const day = match[2].padStart(2, '0');
      const month = months[match[3].toLowerCase()];
      const year = match[4];
      return `${year}-${month}-${day}`;
    }
    
    // Try parsing as ISO date
    const isoDate = new Date(value);
    if (!isNaN(isoDate.getTime())) {
      return isoDate.toISOString().split('T')[0];
    }
    
    // Return original if can't parse
    return null;
  }

  isDateInPeriod(dateStr, period = 'all') {
    const normalized = this.parseDate(dateStr);
    if (!normalized) return false;
    if (period === 'all') return true;
    const date = new Date(`${normalized}T00:00:00`);
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfThisYear = new Date(now.getFullYear(), 0, 1);
    switch (period) {
      case 'this_month':
        return date >= startOfThisMonth && date <= now;
      case 'this_year':
        return date >= startOfThisYear && date <= now;
      case 'last_6_months':
        return date >= new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      case 'last_12_months':
        return date >= new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      default:
        return true;
    }
  }

  getTimeSeriesData(period = 'all') {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT order_date, total_amount, tcgplayer_fee
        FROM orders
        WHERE order_date IS NOT NULL
      `, (err, orderRows) => {
        if (err) {
          reject(err);
          return;
        }

        const monthlyData = {};
        orderRows.forEach(row => {
          if (!this.isDateInPeriod(row.order_date, period)) return;
          const parsedDate = this.parseDate(row.order_date);
          if (parsedDate) {
            const month = parsedDate.substring(0, 7);
            if (!monthlyData[month]) {
              monthlyData[month] = {
                month: month,
                revenue: 0,
                costs: 0,
                fees: 0,
                profit: 0
              };
            }
            monthlyData[month].revenue += row.total_amount || 0;
            monthlyData[month].fees += row.tcgplayer_fee || 0;
          }
        });

        this.db.all(`
          SELECT date, amount
          FROM costs
          WHERE date IS NOT NULL
        `, (err, costRows) => {
          if (err) {
            reject(err);
            return;
          }

          costRows.forEach(row => {
            if (!this.isDateInPeriod(row.date, period)) return;
            const parsedDate = this.parseDate(row.date);
            if (parsedDate) {
              const month = parsedDate.substring(0, 7);
              if (monthlyData[month]) {
                monthlyData[month].costs += row.amount || 0;
              } else {
                monthlyData[month] = {
                  month: month,
                  revenue: 0,
                  costs: row.amount || 0,
                  fees: 0,
                  profit: 0
                };
              }
            }
          });

          Object.values(monthlyData).forEach(data => {
            data.profit = data.revenue - data.costs - data.fees;
          });

          const result = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
          resolve(result);
        });
      });
    });
  }

  getMetrics() {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders', (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        const revenue = row.total;

        this.db.get('SELECT COALESCE(SUM(purchase_price * quantity), 0) as total FROM inventory', (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          const inventoryCOGS = row.total;

          this.db.get('SELECT COALESCE(SUM(amount), 0) as total FROM costs', (err, row) => {
            if (err) {
              reject(err);
              return;
            }
            const costsCOGS = row.total;

            const cogs = inventoryCOGS + costsCOGS;

            this.db.get('SELECT COALESCE(SUM(tcgplayer_fee), 0) as total FROM orders', (err, row) => {
              if (err) {
                reject(err);
                return;
              }
              const fees = row.total;

              const profit = revenue - cogs - fees;

              this.db.get('SELECT COUNT(*) as count FROM inventory', (err, row) => {
                if (err) {
                  reject(err);
                  return;
                }
                const inventoryCount = row.count;

                this.db.get('SELECT COUNT(*) as count FROM orders', (err, row) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                  const ordersCount = row.count;

                    resolve({
                      revenue: parseFloat(revenue.toFixed(2)),
                      cogs: parseFloat(cogs.toFixed(2)),
                      otherCosts: 0,
                      tcgplayerFees: parseFloat(fees.toFixed(2)),
                      shippingCosts: 0,
                      profit: parseFloat(profit.toFixed(2)),
                      inventoryCount,
                      ordersCount
                    });
                  });
                });
              });
            });
          });
        });
      });
  }
}

module.exports = DatabaseManager;
