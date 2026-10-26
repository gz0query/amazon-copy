import { renderOrderSummary } from './checkout/orderSummary.js';
import { renderPaymentSummary } from './checkout/paymentSummary.js';
import { products, startRealtimeProductsSync } from '../data/products.js';
import { setCartUser, sanitizeCart, loadFromStorage } from '../data/cart.js';
import { setOrdersUser, syncUserDataFromCloud } from '../data/orders.js';
import { auth, onAuthStateChanged } from './firebase.js';

function renderCheckout() {
  sanitizeCart(new Set(products.map((product) => String(product.id))));
  renderOrderSummary();
  renderPaymentSummary();
}

renderCheckout();
startRealtimeProductsSync(renderCheckout);
window.addEventListener('bypay-cart-updated', renderCheckout);
window.addEventListener('bypay-orders-updated', renderCheckout);
window.addEventListener('pageshow', () => {
  loadFromStorage();
  renderCheckout();
});
window.addEventListener('storage', () => {
  loadFromStorage();
  renderCheckout();
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace('index.html');
    return;
  }

  setCartUser(user.uid);
  setOrdersUser(user.uid);
  renderCheckout();

  syncUserDataFromCloud(user).catch((error) => {
    console.error('Could not refresh checkout data.', error);
  });
});






























