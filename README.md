# TCGPlayer Business Manager

A web-based application to manage Pokemon card business on TCGPlayer.

## Features

- **Scrape TCGPlayer** for inventory and orders
- **Dashboard** with metrics: revenue, COGS, costs, profit
- **Row-by-row editing** for imported data
- **Data management** for inventory, orders, and costs

## Setup

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Configure TCGPlayer API credentials in `backend/.env`

3. Start the development servers:
   ```bash
   npm run dev
   ```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Environment Variables

Create `backend/.env`:
```
TCGPLAYER_PUBLIC_KEY=your_public_key
TCGPLAYER_PRIVATE_KEY=your_private_key
TCGPLAYER_CLIENT_ID=your_client_id
TCGPLAYER_CLIENT_SECRET=your_client_secret
```

## Tech Stack

- **Frontend**: React, Vite, TailwindCSS, shadcn/ui
- **Backend**: Node.js, Express
- **Database**: SQLite
- **Charts**: Recharts
