import { cart, addToCart, setCartUser } from '../data/cart.js';
import { setOrdersUser } from '../data/orders.js';
import { products, loadProducts } from '../data/products.js';
import { formatCurrency } from './utils/money.js';
import { auth, signOut, onAuthStateChanged } from './firebase.js';

function updateCartQuantity() {
  const cartQuantity = cart.reduce(
    (total, cartItem) => total + cartItem.quantity,
    0
  );

  const cartQuantityElement = document.querySelector('.js-cart-quantity');
  if (cartQuantityElement) {
    cartQuantityElement.textContent = cartQuantity;
  }
}

function renderProductsGrid(searchQuery = '') {
  let productsHTML = '';
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(normalizedQuery)
  );

  filteredProducts.forEach((product) => {
    productsHTML += `     
      <div class="product-container">          
        <div class="product-image-container">
          <img class="product-image" src="${product.image}">
        </div>

        <div class="product-name limit-text-to-2-lines">
          ${product.name}
        </div>

        <div class="product-rating-container">
          <img class="product-rating-stars" src="${product.getStarsUrl()}">
          <div class="product-rating-count link-primary">
            ${product.rating.count}
          </div>
        </div>

        <div class="product-price">
          ${product.getPrice()}
        </div>

        <div class="product-quantity-container">
          <select class="js-quantity-selector-${product.id}">
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

        <button 
          class="add-to-cart-button button-primary js-add-to-cart" 
          data-product-id="${product.id}">
          Add to Cart
        </button>
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
let initializedUserId;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace('index.html');
    return;
  }

  const firstName = user.displayName
    ? user.displayName.split(' ')[0]
    : user.email?.split('@')[0] || 'there';
  document.querySelector('#user-greeting').textContent = `Hello, ${firstName}`;

  if (initializedUserId === user.uid) {
    return;
  }
  initializedUserId = user.uid;

  setCartUser(user.uid);
  setOrdersUser(user.uid);
  updateCartQuantity();

  accountToggle.addEventListener('click', () => {
    const isOpen = !accountMenu.hidden;
    accountMenu.hidden = isOpen;
    accountToggle.setAttribute('aria-expanded', String(!isOpen));
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

  let searchQuery = '';
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

  loadProducts(() => renderProductsGrid(searchQuery));
});