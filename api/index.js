const express = require('express');
const cors = require('cors');
const Database = require('../backend/database');
const TCGPlayerAPI = require('../backend/tcgplayer-api');
const csv = require('csv-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const db = new Database();
const tcgplayerAPI = new TCGPlayerAPI();

// Initialize database
db.initialize().then(() => {
  console.log('Database initialization completed');
}).catch(err => {
  console.error('Database initialization failed:', err);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'TCGPlayer Manager API is running' });
});

// Import all routes from backend server
// For now, we'll just export the app for Vercel
module.exports = app;
