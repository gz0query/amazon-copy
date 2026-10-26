import { orders, setOrdersUser } from '../data/orders.js';
import { getProduct, products, startRealtimeProductsSync } from '../data/products.js';
import { getDeliveryOption } from '../data/deliveryOptions.js';
import { formatCurrency } from './utils/money.js';
import { cart, addToCart, setCartUser, sanitizeCart, loadFromStorage } from '../data/cart.js';
import { syncUserDataFromCloud } from '../data/orders.js';
import { auth, onAuthStateChanged } from './firebase.js';

updateCartQuantity();
renderOrders();
startRealtimeProductsSync(renderOrders);
window.addEventListener('bypay-cart-updated', updateCartQuantity);
window.addEventListener('bypay-orders-updated', renderOrders);
window.addEventListener('pageshow', () => {
  if (auth.currentUser) {
    setOrdersUser(auth.currentUser.uid);
    setCartUser(auth.currentUser.uid);
  }
  loadFromStorage();
  updateCartQuantity();
  renderOrders();
});
window.addEventListener('storage', () => {
  loadFromStorage();
  updateCartQuantity();
  renderOrders();
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace('index.html');
    return;
  }

  setOrdersUser(user.uid);
  setCartUser(user.uid);
  sanitizeCart(new Set(products.map((product) => String(product.id))));
  updateCartQuantity();
  renderOrders();

  syncUserDataFromCloud(user).catch((error) => {
    console.error('Could not refresh orders and product data.', error);
  });
});

function updateCartQuantity() {
  sanitizeCart(new Set(products.map((product) => String(product.id))));
  const cartQuantity = cart.reduce(
    (total, cartItem) => total + (getProduct(cartItem.productId) ? cartItem.quantity : 0),
    0
  );
  const cartQuantityElement = document.querySelector('.js-cart-quantity');

  if (cartQuantityElement) {
    cartQuantityElement.textContent = cartQuantity;
  }
}

function renderOrders() {
  const ordersGrid = document.querySelector('.js-orders-grid');
  if (!ordersGrid) {
    return;
  }

  if (orders.length === 0) {
    ordersGrid.innerHTML = '<p class="empty-orders-message">You have no orders yet.</p>';
    return;
  }

  ordersGrid.innerHTML = orders.map((order) => {
    const orderId = order.orderId || order.id;
    const orderItems = order.items || order.products;
    const orderDate = formatOrderDate(order);

    if (!Array.isArray(orderItems)) {
      throw new Error(`Order ${orderId} is missing its item list.`);
    }

    const itemsHTML = orderItems.map((item) => {
      const product = getProduct(item.productId);
      if (!product) return '';

      const arrivalDate = formatArrivalDate(order, item);

      return `
        <div class="product-image-container">
          <img src="${product.image}" alt="${product.name}">
        </div>

        <div class="product-details">
          <div class="product-name">${product.name}</div>
          <div class="product-delivery-date">Arriving on: ${arrivalDate}</div>
          <div class="product-quantity">Quantity: ${item.quantity}</div>
          <button
            class="buy-again-button button-primary js-buy-again"
            type="button"
            data-product-id="${item.productId}">
            <img class="buy-again-icon" src="images/icons/buy-again.png" alt="">
            <span class="buy-again-message">Buy it again</span>
          </button>
        </div>

        <div class="product-actions">
          <a href="tracking.html?orderId=${encodeURIComponent(orderId)}&productId=${encodeURIComponent(item.productId)}">
            <button class="track-package-button button-secondary" type="button">
              Track package
            </button>
          </a>
        </div>
      `;
    }).join('');

    return `
      <div class="order-container">
        <div class="order-header">
          <div class="order-header-left-section">
            <div class="order-date">
              <div class="order-header-label">Order Placed:</div>
              <div>${orderDate}</div>
            </div>
            <div class="order-total">
              <div class="order-header-label">Total:</div>
              <div>₦${formatCurrency(order.totalCostCents)}</div>
            </div>
          </div>
          <div class="order-header-right-section">
            <div class="order-header-label">Order ID:</div>
            <div>${orderId}</div>
          </div>
        </div>
        <div class="order-details-grid">
          ${itemsHTML}
        </div>
      </div>
    `;
  }).join('');

  ordersGrid.querySelectorAll('.js-buy-again').forEach((button) => {
    button.addEventListener('click', () => {
      addToCart(button.dataset.productId, 1);
      updateCartQuantity();
    });
  });
}

function formatOrderDate(order) {
  if (order.orderDate) {
    return order.orderDate;
  }

  const date = new Date(order.placedAt || order.orderTime);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Order ${order.orderId || order.id} has an invalid order date.`);
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}

function formatArrivalDate(order, item) {
  let arrivalDate;

  if (item.estimatedDeliveryTime) {
    arrivalDate = new Date(item.estimatedDeliveryTime);
  } else {
    arrivalDate = new Date(order.placedAt || order.orderTime || order.orderDate);
    const deliveryOption = getDeliveryOption(item.deliveryOptionId);
    arrivalDate.setDate(arrivalDate.getDate() + deliveryOption.deliveryDays);
  }

  if (Number.isNaN(arrivalDate.getTime())) {
    throw new Error(`Order ${order.orderId || order.id} has an invalid delivery date.`);
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric'
  }).format(arrivalDate);
}
