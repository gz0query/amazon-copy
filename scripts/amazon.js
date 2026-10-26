import { cart, addToCart, setCartUser, sanitizeCart, loadFromStorage } from '../data/cart.js';
import { setOrdersUser, syncUserDataFromCloud } from '../data/orders.js';
import { products, getProduct, startRealtimeProductsSync } from '../data/products.js';
import { formatCurrency } from './utils/money.js';
import { auth, signOut, onAuthStateChanged } from './firebase.js';

let searchQuery = '';

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

function generateStars(rating) {
  const safeRating = Number.isFinite(rating)
    ? Math.min(5, Math.max(0, rating))
    : 0;
  const roundedRating = Math.round(safeRating * 2) / 2;
  const fullStars = Math.floor(roundedRating);
  const hasHalfStar = roundedRating % 1 !== 0;
  const emptyStars = 5 - fullStars - Number(hasHalfStar);
  const halfStar = hasHalfStar
    ? `<svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#d5d9d9" d="M12 2.2l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z"/>
        <path fill="currentColor" d="M12 2.2l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" style="clip-path: inset(0 50% 0 0)"/>
      </svg>`
    : '';

  return `${'★'.repeat(fullStars)}${halfStar}${'☆'.repeat(emptyStars)}`;
}

function renderProductsGrid(searchQuery = '') {
  let productsHTML = '';
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(normalizedQuery)
  );

  filteredProducts.forEach((product) => {
    const isSoldOut = product.inStock === false;
    productsHTML += `     
      <div class="product-container">          
        <div class="product-image-container">
          <img class="product-image" src="${product.image}">
          ${isSoldOut ? '<span class="sold-out-badge">SOLD OUT</span>' : ''}
        </div>

        <div class="product-name limit-text-to-2-lines">
          ${product.name}
        </div>

        <div class="product-rating-container">
          <span
            class="product-rating-stars"
            role="img"
            aria-label="${product.rating.stars} out of 5 stars">
            ${generateStars(product.rating.stars)}
          </span>
          <div class="product-rating-count link-primary">
            ${product.rating.count}
          </div>
        </div>

        <div class="product-price">
          ${product.getPrice()}
        </div>

        <div class="product-quantity-container">
          <select class="js-quantity-selector-${product.id}" ${isSoldOut ? 'disabled' : ''}>
            <option selected value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
            <option value="6">6</option>
            <option value="7">7</option>
            <option value="8">8</option>
            <option value="9">9</option>
            <option value="10">10</option>
          </select>
        </div>
        
        ${product.extraInfoHTML()}

        <div class="product-spacer"></div>
        <div class="added-to-cart">
          <img src="images/icons/checkmark.png">
          Added
        </div>

        ${isSoldOut
        ? '<button class="add-to-cart-button button-primary sold-out-button" disabled>Sold Out</button>'
        : `<button
              class="add-to-cart-button button-primary js-add-to-cart"
              data-product-id="${product.id}">
              Add to Cart
            </button>`}
      </div>
    `;
  });

  const productsGrid = document.querySelector('.js-products-grid');
  if (productsGrid) {
    productsGrid.innerHTML = filteredProducts.length
      ? productsHTML
      : '<p class="no-products-message">No products found.</p>';
  }

  updateCartQuantity();

  document.querySelectorAll('.js-add-to-cart').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.dataset.productId;
      const product = products.find((item) => item.id === productId);
      if (product?.inStock === false) {
        return;
      }
      const quantity = Number(
        document.querySelector(`.js-quantity-selector-${productId}`).value
      );
      addToCart(productId, quantity);
      updateCartQuantity();
    });
  });
}

const searchInput = document.querySelector('.search-bar');
const searchButton = document.querySelector('.search-button');
const accountContainer = document.querySelector('#account-container');
const accountToggle = document.querySelector('#account-toggle');
const accountMenu = document.querySelector('#account-menu');
const hamburgerIcon = document.querySelector('#hamburger-icon');
const sidebarMenu = document.querySelector('#sidebar-menu');
const sidebarOverlay = document.querySelector('#sidebar-overlay');
const sidebarClose = document.querySelector('#sidebar-close');
const sidebarName = document.querySelector('#sidebar-name');
let initializedUserId;
let searchEventsInitialized = false;

function setSidebarOpen(isOpen) {
  sidebarMenu.classList.toggle('active', isOpen);
  sidebarOverlay.classList.toggle('active', isOpen);
  sidebarMenu.setAttribute('aria-hidden', String(!isOpen));
  sidebarOverlay.setAttribute('aria-hidden', String(!isOpen));
  hamburgerIcon.setAttribute('aria-expanded', String(isOpen));
}

function updateHeaderGreeting(firstName) {
  document.querySelectorAll('.greeting-text').forEach((element) => {
    const helloPrefix = document.createElement('span');
    helloPrefix.className = 'hello-prefix';
    helloPrefix.textContent = 'Hello, ';

    const firstNameElement = document.createElement('span');
    firstNameElement.className = 'first-name-only';
    firstNameElement.textContent = firstName;

    element.replaceChildren(helloPrefix, firstNameElement);
  });
}

hamburgerIcon.addEventListener('click', () => setSidebarOpen(true));
hamburgerIcon.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    setSidebarOpen(true);
  }
});
sidebarClose.addEventListener('click', () => setSidebarOpen(false));
sidebarOverlay.addEventListener('click', () => setSidebarOpen(false));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setSidebarOpen(false);
  }
});

function initializeSearchEvents() {
  if (searchEventsInitialized) {
    return;
  }
  searchEventsInitialized = true;

  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value;
    renderProductsGrid(searchQuery);
  });

  searchButton.addEventListener('click', () => {
    searchQuery = searchInput.value;
    renderProductsGrid(searchQuery);
  });

  searchInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchQuery = searchInput.value;
      renderProductsGrid(searchQuery);
    }
  });
}

renderProductsGrid();
updateCartQuantity();
startRealtimeProductsSync(() => renderProductsGrid(searchQuery));
initializeSearchEvents();
window.addEventListener('bypay-cart-updated', updateCartQuantity);
window.addEventListener('pageshow', () => {
  loadFromStorage();
  renderProductsGrid(searchQuery);
});
window.addEventListener('storage', () => {
  renderProductsGrid(searchQuery);
});

onAuthStateChanged(auth, async (user) => {
  const adminLink = document.getElementById('sidebar-admin-portal');
  if (adminLink) {
    adminLink.style.display =
      user && user.email && user.email.toLowerCase() === 'goodluckbello85@gmail.com'
        ? 'block'
        : 'none';
  }

  if (!user) {
    window.location.replace('index.html');
    return;
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'User';
  const firstName = (displayName || 'User').trim().split(/\s+/)[0];
  updateHeaderGreeting(firstName);
  sidebarName.textContent = `Hello, ${firstName}`;

  if (initializedUserId === user.uid) {
    return;
  }
  initializedUserId = user.uid;

  setCartUser(user.uid);
  setOrdersUser(user.uid);
  updateCartQuantity();
  syncUserDataFromCloud(user)
    .then(() => {
      updateCartQuantity();
      renderProductsGrid(searchQuery);
    })
    .catch((error) => {
      console.error('Could not restore user data from Firestore.', error);
      updateCartQuantity();
    });

  accountMenu.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.addEventListener('click', (event) => {
    if (!accountContainer.contains(event.target)) {
      accountMenu.hidden = true;
      accountToggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelector('#btn-header-signout').addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (error) {
      alert(`Could not sign out: ${error.message}`);
    }
  });

  document.getElementById('sidebar-logout')?.addEventListener('click', (event) => {
    event.preventDefault();
    signOut(auth).then(() => {
      window.location.href = 'index.html';
    }).catch((error) => console.error('Logout failed:', error));
  });

});