const axios = require('axios');

class TCGPlayerAPI {
  constructor() {
    this.baseUrl = 'https://api.tcgplayer.com';
    this.publicKey = process.env.TCGPLAYER_PUBLIC_KEY;
    this.privateKey = process.env.TCGPLAYER_PRIVATE_KEY;
    this.clientId = process.env.TCGPLAYER_CLIENT_ID;
    this.clientSecret = process.env.TCGPLAYER_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  isConfigured() {
    return this.publicKey && this.privateKey && this.clientId && this.clientSecret;
  }

  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/token`, {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // Refresh 1 minute before expiry
      return this.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with TCGPlayer API');
    }
  }

  async getHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async getInventory() {
    if (!this.isConfigured()) {
      throw new Error('TCGPlayer API credentials not configured. Please set TCGPLAYER_PUBLIC_KEY, TCGPLAYER_PRIVATE_KEY, TCGPLAYER_CLIENT_ID, and TCGPLAYER_CLIENT_SECRET in .env');
    }

    try {
      const headers = await this.getHeaders();
      
      // Get seller inventory
      const response = await axios.get(
        `${this.baseUrl}/catalog/inventory`,
        { headers }
      );

      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching inventory:', error.response?.data || error.message);
      throw new Error('Failed to fetch inventory from TCGPlayer');
    }
  }

  async getOrders() {
    if (!this.isConfigured()) {
      throw new Error('TCGPlayer API credentials not configured. Please set TCGPLAYER_PUBLIC_KEY, TCGPLAYER_PRIVATE_KEY, TCGPLAYER_CLIENT_ID, and TCGPLAYER_CLIENT_SECRET in .env');
    }

    try {
      const headers = await this.getHeaders();
      
      // Get seller orders
      const response = await axios.get(
        `${this.baseUrl}/orders`,
        { headers }
      );

      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching orders:', error.response?.data || error.message);
      throw new Error('Failed to fetch orders from TCGPlayer');
    }
  }

  // Helper method to convert TCGPlayer inventory item to our format
  convertInventoryItem(tcgItem) {
    return {
      name: tcgItem.product?.name || tcgItem.name || 'Unknown',
      set_name: tcgItem.product?.set?.name || tcgItem.set_name || null,
      condition: tcgItem.condition?.name || tcgItem.condition || null,
      quantity: tcgItem.quantity || 0,
      purchase_price: tcgItem.purchase_price || 0,
      list_price: tcgItem.price || tcgItem.list_price || 0,
      tcgplayer_id: tcgItem.skuId || tcgItem.product?.productId || null
    };
  }

  // Helper method to convert TCGPlayer order to our format
  convertOrder(tcgOrder) {
    return {
      order_number: tcgOrder.orderNumber || tcgOrder.order_id || null,
      order_date: tcgOrder.orderDate || tcgOrder.created_at || null,
      buyer_name: tcgOrder.buyer?.name || tcgOrder.buyer_name || null,
      total_amount: tcgOrder.total || tcgOrder.total_amount || 0,
      shipping_cost: tcgOrder.shipping?.cost || tcgOrder.shipping_cost || 0,
      tcgplayer_fee: tcgOrder.fees?.tcgplayer || tcgOrder.tcgplayer_fee || 0,
      status: tcgOrder.status?.toLowerCase() || 'pending',
      items: tcgOrder.items || []
    };
  }
}

module.exports = TCGPlayerAPI;
