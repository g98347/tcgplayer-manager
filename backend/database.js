const { Pool } = require('pg');

class DatabaseManager {
  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/tcgplayer_manager';
    this.pool = new Pool({
      connectionString,
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
    });

    this.pool.on('connect', () => {
      console.log('Connected to PostgreSQL database');
    });

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }

  async createBackup() {
    // PostgreSQL on Render handles backups automatically
    // This is a placeholder for custom backup logic if needed
    console.log('PostgreSQL backup handled by Render');
    return 'PostgreSQL backup handled by Render';
  }

  async initialize() {
    const client = await this.pool.connect();
    try {
      // Inventory table
      await client.query(`
        CREATE TABLE IF NOT EXISTS inventory (
          id SERIAL PRIMARY KEY,
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

      // Orders table
      await client.query(`
        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
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

      // Costs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS costs (
          id SERIAL PRIMARY KEY,
          category TEXT NOT NULL,
          description TEXT,
          amount REAL DEFAULT 0,
          cost_type TEXT DEFAULT 'operating',
          date TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Settings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id SERIAL PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          description TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Add columns if they don't exist (PostgreSQL doesn't have IF NOT EXISTS for ALTER TABLE)
      try {
        await client.query(`ALTER TABLE costs ADD COLUMN IF NOT EXISTS cost_type TEXT DEFAULT 'operating'`);
      } catch (e) { /* Column might already exist */ }
      try {
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_amount REAL DEFAULT 0`);
      } catch (e) { /* Column might already exist */ }
      try {
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_fees REAL DEFAULT 0`);
      } catch (e) { /* Column might already exist */ }
      try {
        await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'`);
      } catch (e) { /* Column might already exist */ }

      console.log('Database initialized successfully');
    } catch (err) {
      console.error('Error creating tables:', err);
    } finally {
      client.release();
    }
  }

  // Inventory methods
  async getInventory() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM inventory ORDER BY name');
      return result.rows;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async addInventoryItem(item) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO inventory (name, set_name, condition, quantity, purchase_price, list_price, tcgplayer_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
          item.name,
          item.set_name || null,
          item.condition || null,
          item.quantity || 0,
          item.purchase_price || 0,
          item.list_price || 0,
          item.tcgplayer_id || null
        ]
      );
      return result.rows[0].id;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async updateInventoryItem(id, item) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE inventory
         SET name = $1, set_name = $2, condition = $3, quantity = $4,
             purchase_price = $5, list_price = $6, tcgplayer_id = $7, last_updated = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [
          item.name,
          item.set_name || null,
          item.condition || null,
          item.quantity || 0,
          item.purchase_price || 0,
          item.list_price || 0,
          item.tcgplayer_id || null,
          id
        ]
      );
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteInventoryItem(id) {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM inventory WHERE id = $1', [id]);
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  // Orders methods
  async getOrders() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM orders ORDER BY order_date DESC');
      return result.rows;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async addOrder(order) {
    const client = await this.pool.connect();
    try {
      const normalizedDate = this.parseDate(order.order_date);
      const result = await client.query(
        `INSERT INTO orders (order_number, order_date, buyer_name, total_amount, shipping_cost, tcgplayer_fee, refunded_amount, refunded_fees, status, source, items)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
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
          JSON.stringify(order.items || [])
        ]
      );
      return result.rows[0].id;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async updateOrder(id, order) {
    const client = await this.pool.connect();
    try {
      const normalizedDate = this.parseDate(order.order_date);
      await client.query(
        `UPDATE orders
         SET order_number = $1, order_date = $2, buyer_name = $3, total_amount = $4,
             shipping_cost = $5, tcgplayer_fee = $6, refunded_amount = $7, refunded_fees = $8, status = $9, source = $10, items = $11
         WHERE id = $12`,
        [
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
          id
        ]
      );
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteOrder(id) {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM orders WHERE id = $1', [id]);
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  // Settings methods
  async getSettings() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM settings ORDER BY key');
      return result.rows;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async getSetting(key) {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM settings WHERE key = $1', [key]);
      return result.rows[0];
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async setSetting(key, value, description = null) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO settings (key, value, description, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (key) DO UPDATE SET
           value = EXCLUDED.value,
           description = EXCLUDED.description,
           updated_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [key, value, description]
      );
      return result.rows[0].id;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async updateSetting(id, key, value, description) {
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE settings
         SET key = $1, value = $2, description = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [key, value, description, id]
      );
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteSetting(id) {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM settings WHERE id = $1', [id]);
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  // Costs methods
  async getCosts() {
    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT * FROM costs ORDER BY date DESC');
      return result.rows;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async addCost(cost) {
    const client = await this.pool.connect();
    try {
      const normalizedDate = this.parseDate(cost.date);
      const result = await client.query(
        `INSERT INTO costs (category, description, amount, cost_type, date)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [
          cost.category,
          cost.description || null,
          cost.amount || 0,
          cost.cost_type || 'operating',
          normalizedDate
        ]
      );
      return result.rows[0].id;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async updateCost(id, cost) {
    const client = await this.pool.connect();
    try {
      const normalizedDate = this.parseDate(cost.date);
      await client.query(
        `UPDATE costs
         SET category = $1, description = $2, amount = $3, cost_type = $4, date = $5
         WHERE id = $6`,
        [
          cost.category,
          cost.description || null,
          cost.amount || 0,
          cost.cost_type || 'operating',
          normalizedDate,
          id
        ]
      );
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async deleteCost(id) {
    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM costs WHERE id = $1', [id]);
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  // Metrics methods
  async getMetricsWithPeriod(period = 'all') {
    const client = await this.pool.connect();
    try {
      const ordersResult = await client.query('SELECT * FROM orders');
      const costsResult = await client.query('SELECT * FROM costs');
      const inventoryResult = await client.query('SELECT COALESCE(SUM(purchase_price * quantity), 0) as total, COUNT(*) as count FROM inventory');

      const orders = ordersResult.rows;
      const costs = costsResult.rows;
      const inventoryRow = inventoryResult.rows[0];

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

      return {
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
      };
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
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

  async getTimeSeriesData(period = 'all') {
    const client = await this.pool.connect();
    try {
      const orderRows = await client.query(`
        SELECT order_date, total_amount, tcgplayer_fee
        FROM orders
        WHERE order_date IS NOT NULL
      `);

      const monthlyData = {};
      orderRows.rows.forEach(row => {
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

      const costRows = await client.query(`
        SELECT date, amount
        FROM costs
        WHERE date IS NOT NULL
      `);

      costRows.rows.forEach(row => {
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
      return result;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async getMetrics() {
    const client = await this.pool.connect();
    try {
      const revenueResult = await client.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders');
      const revenue = revenueResult.rows[0].total;

      const inventoryCOGSResult = await client.query('SELECT COALESCE(SUM(purchase_price * quantity), 0) as total FROM inventory');
      const inventoryCOGS = inventoryCOGSResult.rows[0].total;

      const costsCOGSResult = await client.query('SELECT COALESCE(SUM(amount), 0) as total FROM costs');
      const costsCOGS = costsCOGSResult.rows[0].total;

      const cogs = inventoryCOGS + costsCOGS;

      const feesResult = await client.query('SELECT COALESCE(SUM(tcgplayer_fee), 0) as total FROM orders');
      const fees = feesResult.rows[0].total;

      const profit = revenue - cogs - fees;

      const inventoryCountResult = await client.query('SELECT COUNT(*) as count FROM inventory');
      const inventoryCount = inventoryCountResult.rows[0].count;

      const ordersCountResult = await client.query('SELECT COUNT(*) as count FROM orders');
      const ordersCount = ordersCountResult.rows[0].count;

      return {
        revenue: parseFloat(revenue.toFixed(2)),
        cogs: parseFloat(cogs.toFixed(2)),
        otherCosts: 0,
        tcgplayerFees: parseFloat(fees.toFixed(2)),
        shippingCosts: 0,
        profit: parseFloat(profit.toFixed(2)),
        inventoryCount,
        ordersCount
      };
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = DatabaseManager;
