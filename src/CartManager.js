const API_BASE_URL = 'http://localhost:8000/api';

class CartManager {
  constructor() {
    this.storageKey = 'munchies_cart';
    // Load the cart from localStorage if it exists, otherwise initialize an empty array
    this.cart = JSON.parse(localStorage.getItem(this.storageKey)) || [];
  }

  // Helper to persist the current cart state to localStorage
  _saveCart() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.cart));
  }

  addItem(item) {
    const existingItem = this.cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      // If the item is already in the cart, just increase the quantity
      existingItem.quantity += 1;
    } else {
      // Otherwise, add the new item with a default quantity of 1
      this.cart.push({ ...item, quantity: 1 });
    }
    
    this._saveCart();
  }

  removeItem(id) {
    // Filter out the item with the matching id
    this.cart = this.cart.filter(cartItem => cartItem.id !== id);
    this._saveCart();
  }

  updateQuantity(id, delta) {
    const item = this.cart.find(cartItem => cartItem.id === id);
    
    if (item) {
      item.quantity += delta;
      
      // If the quantity drops to 0 or below, remove the item entirely
      if (item.quantity <= 0) {
        this.removeItem(id);
      } else {
        this._saveCart();
      }
    }
  }

  calculateTotal() {
    // Calculate the total by summing up (price * quantity) for all items
    const total = this.cart.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
    
    return total.toFixed(2);
  }

  clearCart() {
    this.cart = [];
    this._saveCart();
  }

  async submitOrder(customerInfo) {
    if (this.cart.length === 0) {
      throw new Error("Cannot submit an empty order.");
    }

    // Format the payload to match what the Django backend expects
    const payload = {
      customer_name: customerInfo.name,
      phone_number: customerInfo.phone,
      delivery_address: customerInfo.address,
      items: this.cart.map(item => ({
        menu_item_id: item.id,
        quantity: item.quantity
      }))
    };

    // Send the order to the Django backend
    const response = await fetch(`${API_BASE_URL}/orders/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`Order failed: ${response.statusText}`);

    const data = await response.json();
    this.clearCart();
    window.location.href = `/thank-you?orderId=${data.id}`;
  }
}

export default new CartManager();