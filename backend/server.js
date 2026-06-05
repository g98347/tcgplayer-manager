const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const Database = require('./database');
const TCGPlayerAPI = require('./tcgplayer-api');
const csv = require('csv-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const cron = require('node-cron');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = new Database();
const tcgplayerAPI = new TCGPlayerAPI();

const getCostDedupKey = (cost) => {
  const description = String(cost.description || '').trim().toLowerCase();
  const amount = Number(cost.amount || 0).toFixed(2);
  const date = db.parseDate(cost.date);
  return `${description}|${amount}|${date || ''}`;
};

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Initialize database tables
db.initialize().then(() => {
  console.log('Database initialization completed');
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TCGPlayer Manager API is running' });
});

// File upload endpoint for auto-import
app.post('/api/upload-csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Move file to uploads directory with original name
    const originalName = req.file.originalname;
    const targetPath = path.join(__dirname, 'uploads', originalName);
    fs.renameSync(req.file.path, targetPath);

    console.log(`File uploaded: ${originalName}`);
    res.json({ message: 'File uploaded successfully', filename: originalName });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// Inventory routes
app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await db.getInventory();
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const item = req.body;
    const id = await db.addInventoryItem(item);
    res.json({ id, ...item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = req.body;
    await db.updateInventoryItem(id, item);
    res.json({ id, ...item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteInventoryItem(id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders routes
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await db.getOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = req.body;
    const id = await db.addOrder(order);
    res.json({ id, ...order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = req.body;
    await db.updateOrder(id, order);
    res.json({ id, ...order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteOrder(id);
    res.json({ message: 'Order deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Costs routes
app.get('/api/costs', async (req, res) => {
  try {
    const costs = await db.getCosts();
    res.json(costs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/costs', async (req, res) => {
  try {
    const cost = req.body;
    const id = await db.addCost(cost);
    res.json({ id, ...cost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/costs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cost = req.body;
    await db.updateCost(id, cost);
    res.json({ id, ...cost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/costs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteCost(id);
    res.json({ message: 'Cost deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear all orders
app.delete('/api/orders', async (req, res) => {
  try {
    const orders = await db.getOrders();
    for (const order of orders) {
      await db.deleteOrder(order.id);
    }
    res.json({ message: `Deleted ${orders.length} orders` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings routes
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/settings/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await db.getSetting(key);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json(setting);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { key, value, description } = req.body;
    const id = await db.setSetting(key, value, description);
    res.json({ id, key, value, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { key, value, description } = req.body;
    await db.updateSetting(id, key, value, description);
    res.json({ id, key, value, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/settings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.deleteSetting(id);
    res.json({ message: 'Setting deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Metrics/Dashboard routes
app.get('/api/metrics/time-series', async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const timeSeriesData = await db.getTimeSeriesData(period);
    res.json(timeSeriesData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics/period', async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const metrics = await db.getMetricsWithPeriod(period);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await db.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Backup routes
app.post('/api/backup', async (req, res) => {
  try {
    const backupPath = await db.createBackup();
    res.json({ message: 'Backup created successfully', backupPath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TCGPlayer scraping routes
app.post('/api/scrape/inventory', async (req, res) => {
  try {
    // Check if API is configured
    if (!tcgplayerAPI.isConfigured()) {
      return res.status(400).json({ 
        error: 'TCGPlayer API credentials not configured',
        message: 'Please set TCGPLAYER_PUBLIC_KEY, TCGPLAYER_PRIVATE_KEY, TCGPLAYER_CLIENT_ID, and TCGPLAYER_CLIENT_SECRET in backend/.env'
      });
    }

    // Fetch inventory from TCGPlayer
    const tcgInventory = await tcgplayerAPI.getInventory();
    
    // Convert and save to database
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const tcgItem of tcgInventory) {
      const convertedItem = tcgplayerAPI.convertInventoryItem(tcgItem);
      
      // Check if item already exists by tcgplayer_id
      const existingItems = await db.getInventory();
      const existing = existingItems.find(item => item.tcgplayer_id === convertedItem.tcgplayer_id);
      
      if (existing) {
        await db.updateInventoryItem(existing.id, convertedItem);
        updatedCount++;
      } else {
        await db.addInventoryItem(convertedItem);
        addedCount++;
      }
    }

    res.json({ 
      message: 'Inventory scraping completed successfully',
      added: addedCount,
      updated: updatedCount,
      total: tcgInventory.length
    });
  } catch (error) {
    console.error('Error scraping inventory:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/scrape/orders', async (req, res) => {
  try {
    // Check if API is configured
    if (!tcgplayerAPI.isConfigured()) {
      return res.status(400).json({ 
        error: 'TCGPlayer API credentials not configured',
        message: 'Please set TCGPLAYER_PUBLIC_KEY, TCGPLAYER_PRIVATE_KEY, TCGPLAYER_CLIENT_ID, and TCGPLAYER_CLIENT_SECRET in backend/.env'
      });
    }

    // Fetch orders from TCGPlayer
    const tcgOrders = await tcgplayerAPI.getOrders();
    
    // Convert and save to database
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const tcgOrder of tcgOrders) {
      const convertedOrder = tcgplayerAPI.convertOrder(tcgOrder);
      
      // Check if order already exists by order_number
      const existingOrders = await db.getOrders();
      const existing = existingOrders.find(order => order.order_number === convertedOrder.order_number);
      
      if (existing) {
        await db.updateOrder(existing.id, convertedOrder);
        updatedCount++;
      } else {
        await db.addOrder(convertedOrder);
        addedCount++;
      }
    }

    res.json({ 
      message: 'Orders scraping completed successfully',
      added: addedCount,
      updated: updatedCount,
      total: tcgOrders.length
    });
  } catch (error) {
    console.error('Error scraping orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-import costs from Downloads folder
app.post('/api/auto-import/costs', async (req, res) => {
  try {
    // Create backup before import
    await db.createBackup();

    const downloadsPath = 'C:\\Users\\giofl\\Downloads';

    // Check if Downloads folder exists
    if (!fs.existsSync(downloadsPath)) {
      return res.status(400).json({
        error: 'Downloads folder not found',
        message: 'Could not find C:\\Users\\giofl\\Downloads'
      });
    }

    // Read files in Downloads folder
    const files = fs.readdirSync(downloadsPath);

    // Filter for files starting with "transactions" or containing "pirateship"
    const matchingFiles = files
      .filter(file => {
        const lowerFile = file.toLowerCase();
        return lowerFile.includes('transactions') || lowerFile.includes('pirateship');
      })
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
      .map(file => ({
        name: file,
        path: path.join(downloadsPath, file),
        stats: fs.statSync(path.join(downloadsPath, file))
      }))
      .filter(file => file.stats.isFile())
      .sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs); // Sort by modification time, newest first

    if (matchingFiles.length === 0) {
      return res.status(404).json({
        error: 'No Pirateship transaction files found',
        message: 'No Excel files containing "transactions" or "pirateship" found in Downloads folder'
      });
    }

    // Use the most recent file
    const latestFile = matchingFiles[0];
    console.log(`Auto-importing costs from: ${latestFile.name}`);

    // Parse Excel file
    const workbook = xlsx.readFile(latestFile.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Import to database
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const existingCosts = await db.getCosts();
    const existingCostKeys = new Set(existingCosts.map(getCostDedupKey));

    for (const row of data) {
      const description = row.Description || row.description || row['Transaction Description'] || row['Transaction'] || 'Pirateship Shipping';
      let amount = parseFloat(row.Amount || row.amount || row['Total'] || row['Cost'] || 0) || 0;
      const date = row.Date || row.date || row['Transaction Date'] || row['Date'] || null;
      const labelType = row.Type || row.type || row['Label'] || row['Label Type'] || row['Transaction Type'] || row.Category || row.category;

      // Only import rows with a label type (skip if label type is missing or empty)
      if (!labelType) {
        skippedCount++;
        continue;
      }

      // Skip payment types (only want label types)
      const lowerLabelType = labelType.toLowerCase();
      if (lowerLabelType.includes('payment') ||
          lowerLabelType.includes('credit card') ||
          lowerLabelType.includes('visa') ||
          lowerLabelType.includes('mastercard') ||
          lowerLabelType.includes('amex') ||
          lowerLabelType.includes('discover')) {
        skippedCount++;
        continue;
      }

      // Convert negative amounts to positive
      amount = Math.abs(amount);

      const cost = {
        category: labelType,
        description: description,
        amount: amount,
        date: date
      };

      const costKey = getCostDedupKey(cost);

      if (existingCostKeys.has(costKey)) {
        skippedCount++;
        continue;
      }

      await db.addCost(cost);
      existingCostKeys.add(costKey);
      addedCount++;
    }

    res.json({
      message: `Auto-import completed successfully from ${latestFile.name}`,
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: data.length,
      file: latestFile.name
    });
  } catch (error) {
    console.error('Error auto-importing costs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Excel Import routes for Costs (Pirateship transactions)
app.post('/api/import/costs', upload.single('file'), async (req, res) => {
  try {
    // Create backup before import
    await db.createBackup();

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    // Parse Excel file
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Import to database
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const existingCosts = await db.getCosts();
    const existingCostKeys = new Set(existingCosts.map(getCostDedupKey));

    for (const row of data) {
      const cost = {
        category: 'Shipping',
        description: row.Description || row.description || row['Transaction Description'] || row['Transaction'] || 'Pirateship Shipping',
        amount: parseFloat(row.Amount || row.amount || row['Total'] || row['Cost'] || 0) || 0,
        date: row.Date || row.date || row['Transaction Date'] || row['Date'] || null
      };

      const costKey = getCostDedupKey(cost);

      if (existingCostKeys.has(costKey)) {
        skippedCount++;
        continue;
      }

      await db.addCost(cost);
      existingCostKeys.add(costKey);
      addedCount++;
    }

    res.json({
      message: 'Costs import completed successfully',
      added: addedCount,
      updated: updatedCount,
      skipped: skippedCount,
      total: data.length
    });
  } catch (error) {
    console.error('Error importing costs:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// CSV Import routes
app.post('/api/import/inventory', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    const filePath = req.file.path;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Import to database
    let addedCount = 0;
    let updatedCount = 0;

    for (const row of results) {
      const item = {
        name: row.name || row.Name || row.Product || row.product || 'Unknown',
        set_name: row.set_name || row.Set || row.set || null,
        condition: row.condition || row.Condition || row.condition_name || null,
        quantity: parseInt(row.quantity || row.Quantity || row.qty || 0) || 0,
        purchase_price: parseFloat(row.purchase_price || row.Purchase_Price || row.cost || 0) || 0,
        list_price: parseFloat(row.list_price || row.List_Price || row.price || 0) || 0,
        tcgplayer_id: row.tcgplayer_id || row.sku_id || row.skuId || row.sku || null
      };

      // Check if item already exists by tcgplayer_id
      const existingItems = await db.getInventory();
      const existing = item.tcgplayer_id ? existingItems.find(i => i.tcgplayer_id === item.tcgplayer_id) : null;

      if (existing) {
        await db.updateInventoryItem(existing.id, item);
        updatedCount++;
      } else {
        await db.addInventoryItem(item);
        addedCount++;
      }
    }

    res.json({
      message: 'Inventory import completed successfully',
      added: addedCount,
      updated: updatedCount,
      total: results.length
    });
  } catch (error) {
    console.error('Error importing inventory:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/import/orders', upload.single('file'), async (req, res) => {
  try {
    // Create backup before import
    await db.createBackup();

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results = [];
    const filePath = req.file.path;

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    // Import to database
    let addedCount = 0;
    let updatedCount = 0;

    for (const row of results) {
      const order = {
        order_number: row.order_number || row.Order_Number || row.orderId || null,
        order_date: row.order_date || row.Order_Date || row.date || null,
        buyer_name: row.buyer_name || row.Buyer_Name || row.buyer || null,
        total_amount: parseFloat(row.total_amount || row.Total_Amount || row.total || 0) || 0,
        shipping_cost: 0, // Set to 0 - shipping fees are accounted for elsewhere
        tcgplayer_fee: parseFloat(row.tcgplayer_fee || row.TCGPlayer_Fee || row.fee || 0) || 0,
        status: row.status || row.Status || 'pending',
        source: 'tcgplayer',
        items: row.items ? JSON.parse(row.items) : []
      };

      // Check if order already exists by order_number
      const existingOrders = await db.getOrders();
      const existing = order.order_number ? existingOrders.find(o => o.order_number === order.order_number) : null;

      if (existing) {
        // Preserve existing refund fields and source when updating
        const orderToUpdate = {
          ...order,
          refunded_amount: existing.refunded_amount || 0,
          refunded_fees: existing.refunded_fees || 0,
          source: existing.source || order.source
        };
        await db.updateOrder(existing.id, orderToUpdate);
        updatedCount++;
      } else {
        await db.addOrder(order);
        addedCount++;
      }
    }

    res.json({
      message: 'Orders import completed successfully',
      added: addedCount,
      updated: updatedCount,
      total: results.length
    });
  } catch (error) {
    console.error('Error importing orders:', error);
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Auto-import from Downloads folder
app.post('/api/auto-import/orders', async (req, res) => {
  console.log('Auto-import request received');
  try {
    // Create backup before import
    await db.createBackup();

    const downloadsPath = 'C:\\Users\\giofl\\Downloads';
    
    // Check if Downloads folder exists
    if (!fs.existsSync(downloadsPath)) {
      return res.status(400).json({ 
        error: 'Downloads folder not found',
        message: 'Could not find C:\\Users\\giofl\\Downloads'
      });
    }

    // Read files in Downloads folder
    const files = fs.readdirSync(downloadsPath);

    // Filter for TCGPlayer or eBay order files
    const matchingFiles = files
      .filter(file =>
        file.toLowerCase().startsWith('tcgplayer_orderlist') ||
        file.toLowerCase().startsWith('ebay-ordersreport')
      )
      .map(file => ({
        name: file,
        path: path.join(downloadsPath, file),
        stats: fs.statSync(path.join(downloadsPath, file))
      }))
      .filter(file => file.stats.isFile());

    if (matchingFiles.length === 0) {
      return res.status(404).json({
        error: 'No order files found',
        message: 'No files starting with "TCGplayer_OrderList" or "eBay-OrdersReport" found in Downloads folder'
      });
    }

    // Separate eBay and TCGPlayer files
    const ebayFiles = matchingFiles.filter(f => f.name.toLowerCase().startsWith('ebay-ordersreport'));
    const tcgFiles = matchingFiles.filter(f => f.name.toLowerCase().startsWith('tcgplayer_orderlist'));

    // Use the most recent file from each type
    const filesToImport = [];
    if (ebayFiles.length > 0) {
      const latestEbay = ebayFiles.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)[0];
      filesToImport.push({ ...latestEbay, type: 'ebay' });
    }
    if (tcgFiles.length > 0) {
      const latestTcg = tcgFiles.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)[0];
      filesToImport.push({ ...latestTcg, type: 'tcgplayer' });
    }

    if (filesToImport.length === 0) {
      return res.status(404).json({
        error: 'No order files found',
        message: 'No files starting with "TCGplayer_OrderList" or "eBay-OrdersReport" found in Downloads folder'
      });
    }

    console.log(`Auto-importing from ${filesToImport.length} file(s): ${filesToImport.map(f => `${f.name} (${f.type})`).join(', ')}`);

    let totalAddedCount = 0;
    let totalUpdatedCount = 0;
    const importResults = [];

    // Process each file
    for (const fileToImport of filesToImport) {
      const isEbayFile = fileToImport.type === 'ebay';
      console.log(`Processing: ${fileToImport.name} (${isEbayFile ? 'eBay' : 'TCGPlayer'})`);

      const results = [];
      let addedCount = 0;
      let updatedCount = 0;

      // Parse CSV file
      await new Promise((resolve, reject) => {
        try {
          let fileContent = fs.readFileSync(fileToImport.path, 'utf8');
          // Remove BOM if present
          if (fileContent.charCodeAt(0) === 0xFEFF) {
            fileContent = fileContent.slice(1);
          }

          // Helper function to parse CSV line handling quoted fields
          const parseCSVLine = (line) => {
            const values = [];
            let current = '';
            let inQuotes = false;

            for (let char of line) {
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());
            return values;
          };

          if (isEbayFile) {
          console.log('Using manual eBay CSV parser with proper CSV handling');
          // eBay CSV: manual parsing with proper CSV handling
          const lines = fileContent.split('\n');
          let headerIndex = -1;
          let headers = [];

          // Find header row (first non-empty row with column names)
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes('Sales Record Number') && line.includes('Order Number')) {
              headerIndex = i;
              // Parse header line properly handling quotes
              const headerValues = parseCSVLine(line);
              headers = headerValues.map(h => h.replace(/"/g, '').trim());
              console.log(`Found header at line ${i}:`, headers.slice(0, 5));
              break;
            }
          }

          if (headerIndex === -1) {
            reject(new Error('Could not find header row in eBay CSV'));
            return;
          }

          // Parse data rows (skip header and empty row after header)
          for (let i = headerIndex + 2; i < lines.length; i++) {
            const line = lines[i].trim();
            // Skip footer rows
            if (line.includes('record(s) downloaded') || line.includes('Seller ID') || line === '') {
              continue;
            }

            // Parse CSV line handling quoted fields
            const values = parseCSVLine(line);

            // Create row object
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });

            // Skip empty rows
            const hasData = Object.values(row).some(val => val && val.trim() !== '');
            if (hasData) {
              results.push(row);
              // Log first few rows to debug
              if (results.length <= 3) {
                console.log(`Row ${results.length}:`, Object.keys(row).slice(0, 5), '...');
                console.log(`Order Number: ${row['Order Number']}, Total Price: ${row['Total Price']}, Paid On Date: ${row['Paid On Date']}`);
              }
            }
          }
          console.log(`Total eBay rows parsed: ${results.length}`);
          resolve();
        } else {
          // TCGPlayer CSV - use manual parser to ensure headers are read correctly
          console.log('Using manual TCGPlayer CSV parser');
          const lines = fileContent.split('\n');
          if (lines.length === 0) {
            reject(new Error('Empty CSV file'));
            return;
          }

          // Parse header from first line
          const headerLine = lines[0].trim();
          const headers = parseCSVLine(headerLine);
          console.log(`TCGPlayer headers:`, headers.slice(0, 5));

          // Parse data rows
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;

            const values = parseCSVLine(line);
            const row = {};
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });

            results.push(row);
          }

          console.log(`Total TCGPlayer rows parsed: ${results.length}`);
          resolve();
        }
        } catch (error) {
          console.error('Error parsing CSV:', error);
          reject(error);
        }
      });

    // Import to database
    console.log(`Starting import of ${results.length} rows`);

    addedCount = 0;
    updatedCount = 0;

    for (const row of results) {
      let order;

      if (isEbayFile) {
        // Skip footer row
        if (row['Order Number'] && row['Order Number'].includes('record')) {
          continue;
        }

        // eBay CSV mapping - remove $ signs and parse as numbers
        const parseCurrency = (val) => {
          if (!val) return 0;
          const cleaned = String(val).replace(/[$,]/g, '').trim();
          return parseFloat(cleaned) || 0;
        };

        const totalAmount = parseCurrency(row['Total Price']);
        const paidDate = row['Paid On Date'];

        console.log(`Checking order ${row['Order Number']}: Total=${totalAmount}, Paid=${paidDate}`);

        // Skip canceled/refunded orders (Total Price = 0 or no Paid On Date)
        if (totalAmount === 0 || !paidDate || paidDate.trim() === '') {
          console.log(`Skipping unpaid/canceled order: ${row['Order Number']} (Total: ${totalAmount}, Paid: ${paidDate})`);
          continue;
        }

        const soldFor = parseCurrency(row['Sold For']);
        const shipping = parseCurrency(row['Shipping And Handling']);
        const tax = parseCurrency(row['eBay Collected Tax']);

        // Get eBay fee settings from database
        const feePercentageSetting = await db.getSetting('ebay_fee_percentage');
        const feeFixedSetting = await db.getSetting('ebay_fee_fixed');
        const feePercentage = feePercentageSetting ? parseFloat(feePercentageSetting.value) : 13.6;
        const feeFixed = feeFixedSetting ? parseFloat(feeFixedSetting.value) : 0.30;

        // Calculate eBay fee using settings
        const ebayFee = (totalAmount * (feePercentage / 100)) + feeFixed;

        // Determine status from Shipped On Date
        const shippedDate = row['Shipped On Date'];
        const status = shippedDate && shippedDate.trim() !== '' ? 'shipped' : 'pending';

        order = {
          order_number: row['Order Number'] || null,
          order_date: row['Sale Date'] || null,
          buyer_name: row['Buyer Name'] || null,
          total_amount: totalAmount,
          shipping_cost: shipping,
          tcgplayer_fee: ebayFee,
          status: status,
          source: 'ebay',
          items: []
        };

        console.log(`eBay order: ${order.order_number}, Total: ${totalAmount}, Fee: ${ebayFee}`);
      } else {
        // TCGPlayer CSV mapping
        console.log(`TCGPlayer row keys:`, Object.keys(row).slice(0, 10));
        console.log(`TCGPlayer row sample:`, Object.entries(row).slice(0, 5));

        const totalAmount = parseFloat(row['Total Amt'] || row['Buyer Paid'] || row.total_amount || row.Total_Amount || row.total || 0) || 0;

        // Get TCGPlayer fee settings from database
        const feePercentageSetting = await db.getSetting('tcgplayer_fee_percentage');
        const feeFixedSetting = await db.getSetting('tcgplayer_fee_fixed');
        const feePercentage = feePercentageSetting ? parseFloat(feePercentageSetting.value) : 12.95;
        const feeFixed = feeFixedSetting ? parseFloat(feeFixedSetting.value) : 0.00;

        // Calculate TCGPlayer fee using settings
        const tcgplayerFee = parseFloat(row.tcgplayer_fee || row.TCGPlayer_Fee || row.fee || 0) || ((totalAmount * (feePercentage / 100)) + feeFixed);

        const orderNumber = row['Order #'] || row.order_number || row.Order_Number || row.orderId || null;
        const orderDate = row['Order Date'] || row.order_date || row.Order_Date || row.date || null;

        console.log(`TCGPlayer order: ${orderNumber}, Total: ${totalAmount}, Date: ${orderDate}`);

        order = {
          order_number: orderNumber,
          order_date: orderDate,
          buyer_name: row['Buyer Name'] || row.buyer_name || row.Buyer_Name || row.buyer || null,
          total_amount: totalAmount,
          shipping_cost: 0, // Set to 0 - shipping fees are accounted for elsewhere
          tcgplayer_fee: tcgplayerFee,
          status: row.Status || row.status || 'pending',
          source: 'tcgplayer',
          items: row.items ? JSON.parse(row.items) : []
        };
      }

      // Check if order already exists by order_number
      const existingOrders = await db.getOrders();
      const existing = order.order_number ? existingOrders.find(o => o.order_number === order.order_number) : null;

      if (existing) {
        // Preserve existing refund fields and source when updating
        const orderToUpdate = {
          ...order,
          refunded_amount: existing.refunded_amount || 0,
          refunded_fees: existing.refunded_fees || 0,
          source: existing.source || order.source // Keep existing source or use new source
        };
        await db.updateOrder(existing.id, orderToUpdate);
        updatedCount++;
      } else {
        await db.addOrder(order);
        addedCount++;
      }
    }

      console.log(`File ${fileToImport.name}: Added ${addedCount}, Updated ${updatedCount}`);
      totalAddedCount += addedCount;
      totalUpdatedCount += updatedCount;
      importResults.push({
        file: fileToImport.name,
        type: fileToImport.type,
        added: addedCount,
        updated: updatedCount,
        total: results.length
      });
    }

    res.json({
      message: `Auto-import completed successfully from ${filesToImport.length} file(s)`,
      files: importResults,
      totalAdded: totalAddedCount,
      totalUpdated: totalUpdatedCount,
      totalProcessed: totalAddedCount + totalUpdatedCount
    });
  } catch (error) {
    console.error('Error auto-importing orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule automatic nightly backup at 2:00 AM
cron.schedule('0 2 * * *', async () => {
  console.log('Running automatic nightly backup...');
  try {
    const backupPath = await db.createBackup();
    console.log(`Automatic backup completed: ${backupPath}`);
  } catch (error) {
    console.error('Error during automatic backup:', error);
  }
});

// Function to run global auto import
const runGlobalAutoImport = async () => {
  console.log('Running automatic global auto import...');
  try {
    // Create backup before import
    await db.createBackup();

    const uploadsPath = path.join(__dirname, 'uploads');

    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
      console.log('Created uploads directory');
    }

    const files = fs.readdirSync(uploadsPath);
    const matchingFiles = files
      .filter(file =>
        file.toLowerCase().startsWith('tcgplayer_orderlist') ||
        file.toLowerCase().startsWith('ebay-ordersreport')
      )
      .map(file => ({
        name: file,
        path: path.join(uploadsPath, file),
        stats: fs.statSync(path.join(uploadsPath, file))
      }))
      .filter(file => file.stats.isFile());

    if (matchingFiles.length === 0) {
      console.log('No matching files found in uploads, skipping auto import');
      return;
    }

    const ebayFiles = matchingFiles.filter(f => f.name.toLowerCase().startsWith('ebay-ordersreport'));
    const tcgFiles = matchingFiles.filter(f => f.name.toLowerCase().startsWith('tcgplayer_orderlist'));

    const filesToImport = [];
    if (ebayFiles.length > 0) {
      const latestEbay = ebayFiles.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)[0];
      filesToImport.push({ ...latestEbay, type: 'ebay' });
    }
    if (tcgFiles.length > 0) {
      const latestTcg = tcgFiles.sort((a, b) => b.stats.mtimeMs - a.stats.mtimeMs)[0];
      filesToImport.push({ ...latestTcg, type: 'tcgplayer' });
    }

    if (filesToImport.length === 0) {
      console.log('No order files found, skipping auto import');
      return;
    }

    console.log(`Auto-importing from ${filesToImport.length} file(s): ${filesToImport.map(f => `${f.name} (${f.type})`).join(', ')}`);

    let totalAddedCount = 0;
    let totalUpdatedCount = 0;

    // Process each file
    for (const fileToImport of filesToImport) {
      const isEbayFile = fileToImport.type === 'ebay';
      console.log(`Processing: ${fileToImport.name} (${isEbayFile ? 'eBay' : 'TCGPlayer'})`);

      const results = [];
      let addedCount = 0;
      let updatedCount = 0;

      // Parse CSV file
      await new Promise((resolve, reject) => {
        try {
          let fileContent = fs.readFileSync(fileToImport.path, 'utf8');
          if (fileContent.charCodeAt(0) === 0xFEFF) {
            fileContent = fileContent.slice(1);
          }

          const parseCSVLine = (line) => {
            const values = [];
            let current = '';
            let inQuotes = false;

            for (let char of line) {
              if (char === '"') {
                inQuotes = !inQuotes;
              } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
              } else {
                current += char;
              }
            }
            values.push(current.trim());
            return values;
          };

          if (isEbayFile) {
            console.log('Using manual eBay CSV parser with proper CSV handling');
            const lines = fileContent.split('\n');
            let headerIndex = -1;
            let headers = [];

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.includes('Sales Record Number') && line.includes('Order Number')) {
                headerIndex = i;
                const headerValues = parseCSVLine(line);
                headers = headerValues.map(h => h.replace(/"/g, '').trim());
                console.log(`Found header at line ${i}:`, headers.slice(0, 5));
                break;
              }
            }

            if (headerIndex === -1) {
              reject(new Error('Could not find header row in eBay CSV'));
              return;
            }

            for (let i = headerIndex + 2; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line.includes('record(s) downloaded') || line.includes('Seller ID') || line === '') {
                continue;
              }

              const values = parseCSVLine(line);
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });

              const hasData = Object.values(row).some(val => val && val.trim() !== '');
              if (hasData) {
                results.push(row);
                if (results.length <= 3) {
                  console.log(`Row ${results.length}:`, Object.keys(row).slice(0, 5), '...');
                  console.log(`Order Number: ${row['Order Number']}, Total Price: ${row['Total Price']}, Paid On Date: ${row['Paid On Date']}`);
                }
              }
            }
            console.log(`Total eBay rows parsed: ${results.length}`);
          } else {
            console.log('Using manual TCGPlayer CSV parser');
            const lines = fileContent.split('\n');
            if (lines.length === 0) {
              reject(new Error('Empty CSV file'));
              return;
            }

            const headerLine = lines[0].trim();
            const headers = parseCSVLine(headerLine);
            console.log(`TCGPlayer headers:`, headers.slice(0, 5));

            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (line === '') continue;

              const values = parseCSVLine(line);
              const row = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });

              results.push(row);
            }

            console.log(`Total TCGPlayer rows parsed: ${results.length}`);
          }
          resolve();
        } catch (error) {
          console.error('Error parsing CSV:', error);
          reject(error);
        }
      });

      // Import to database
      console.log(`Starting import of ${results.length} rows`);

      for (const row of results) {
        let order;

        if (isEbayFile) {
          const parseCurrency = (value) => {
            if (!value) return 0;
            const cleaned = String(value).replace(/[$,]/g, '').trim();
            return parseFloat(cleaned) || 0;
          };

          const totalAmount = parseCurrency(row['Total Price']);
          const paidDate = row['Paid On Date'];

          if (totalAmount === 0 || !paidDate || paidDate.trim() === '') {
            console.log(`Skipping unpaid/canceled order: ${row['Order Number']} (Total: ${totalAmount}, Paid: ${paidDate})`);
            continue;
          }

          const soldFor = parseCurrency(row['Sold For']);
          const shipping = parseCurrency(row['Shipping And Handling']);
          const tax = parseCurrency(row['eBay Collected Tax']);

          const feePercentageSetting = await db.getSetting('ebay_fee_percentage');
          const feeFixedSetting = await db.getSetting('ebay_fee_fixed');
          const feePercentage = feePercentageSetting ? parseFloat(feePercentageSetting.value) : 13.6;
          const feeFixed = feeFixedSetting ? parseFloat(feeFixedSetting.value) : 0.30;

          const ebayFee = (totalAmount * (feePercentage / 100)) + feeFixed;

          const shippedDate = row['Shipped On Date'];
          const status = shippedDate && shippedDate.trim() !== '' ? 'shipped' : 'pending';

          order = {
            order_number: row['Order Number'] || null,
            order_date: row['Sale Date'] || null,
            buyer_name: row['Buyer Name'] || null,
            total_amount: totalAmount,
            shipping_cost: shipping,
            tcgplayer_fee: ebayFee,
            status: status,
            source: 'ebay',
            items: []
          };

          console.log(`eBay order: ${order.order_number}, Total: ${totalAmount}, Fee: ${ebayFee}`);
        } else {
          console.log(`TCGPlayer row keys:`, Object.keys(row).slice(0, 10));
          console.log(`TCGPlayer row sample:`, Object.entries(row).slice(0, 5));

          const totalAmount = parseFloat(row['Total Amt'] || row['Buyer Paid'] || row.total_amount || row.Total_Amount || row.total || 0) || 0;

          const feePercentageSetting = await db.getSetting('tcgplayer_fee_percentage');
          const feeFixedSetting = await db.getSetting('tcgplayer_fee_fixed');
          const feePercentage = feePercentageSetting ? parseFloat(feePercentageSetting.value) : 12.95;
          const feeFixed = feeFixedSetting ? parseFloat(feeFixedSetting.value) : 0.00;

          const tcgplayerFee = parseFloat(row.tcgplayer_fee || row.TCGPlayer_Fee || row.fee || 0) || ((totalAmount * (feePercentage / 100)) + feeFixed);

          const orderNumber = row['Order #'] || row.order_number || row.Order_Number || row.orderId || null;
          const orderDate = row['Order Date'] || row.order_date || row.Order_Date || row.date || null;

          console.log(`TCGPlayer order: ${orderNumber}, Total: ${totalAmount}, Date: ${orderDate}`);

          order = {
            order_number: orderNumber,
            order_date: orderDate,
            buyer_name: row['Buyer Name'] || row.buyer_name || row.Buyer_Name || row.buyer || null,
            total_amount: totalAmount,
            shipping_cost: parseFloat(row['Shipping'] || row.shipping || row.Shipping_Cost || 0) || 0,
            tcgplayer_fee: tcgplayerFee,
            status: 'shipped',
            source: 'tcgplayer',
            items: []
          };
        }

        const existingOrders = await db.getOrders();
        const existing = order.order_number ? existingOrders.find(o => o.order_number === order.order_number) : null;

        if (existing) {
          const orderToUpdate = {
            ...order,
            refunded_amount: existing.refunded_amount || 0,
            refunded_fees: existing.refunded_fees || 0,
            source: existing.source || order.source
          };
          await db.updateOrder(existing.id, orderToUpdate);
          updatedCount++;
        } else {
          await db.addOrder(order);
          addedCount++;
        }
      }

      totalAddedCount += addedCount;
      totalUpdatedCount += updatedCount;
      console.log(`File ${fileToImport.name}: ${addedCount} added, ${updatedCount} updated`);
    }

    console.log(`Global auto import completed: ${totalAddedCount} added, ${totalUpdatedCount} updated`);
  } catch (error) {
    console.error('Error during global auto import:', error);
  }
};

// Schedule hourly global auto import
cron.schedule('0 * * * *', async () => {
  await runGlobalAutoImport();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Automatic nightly backup scheduled for 2:00 AM');
  console.log('Hourly global auto import scheduled');
});
