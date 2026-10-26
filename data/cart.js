import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { auth, db, onAuthStateChanged } from '../scripts/firebase.js';

export let cart = [];
let activeUserId = auth.currentUser?.uid || 'guest';
let cartRevision = 0;

loadFromStorage();

function getCartStorageKey() {
  return activeUserId === 'guest' ? 'cart_guest' : `cart_${activeUserId}`;
}

function persistCartLocally() {
  const serializedCart = JSON.stringify(cart);
  localStorage.setItem(getCartStorageKey(), serializedCart);
  localStorage.setItem('cart', serializedCart);
  localStorage.setItem('cartUserId', activeUserId);
}

function dispatchCartUpdated() {
  window.dispatchEvent(new CustomEvent('bypay-cart-updated'));
}

function replaceCart(cartData, shouldPersist = true) {
  cart.length = 0;
  cart.push(...(Array.isArray(cartData) ? cartData : []));
  sanitizeCart();
  cartRevision += 1;
  if (shouldPersist) {
    persistCartLocally();
  }
  dispatchCartUpdated();
}

function activateCurrentUserCart() {
  const userId = auth.currentUser?.uid;
  if (userId && activeUserId !== userId) {
    setCartUser(userId);
  }
}

export function loadFromStorage() {
  try {
    const storedCart = localStorage.getItem(getCartStorageKey());
    const parsedCart = storedCart ? JSON.parse(storedCart) : [];
    cart.length = 0;
    cart.push(...(Array.isArray(parsedCart) ? parsedCart : []));
    sanitizeCart();
  } catch (error) {
    console.warn('Could not load the saved cart.', error);
    cart.length = 0;
  }
  return cart;
}

export function setCartUser(userId) {
  if (!userId) {
    activeUserId = 'guest';
    cart.length = 0;
    cartRevision += 1;
    localStorage.removeItem('cart');
    localStorage.removeItem('cartUserId');
    dispatchCartUpdated();
    return cart;
  }

  activeUserId = String(userId);
  loadFromStorage();
  persistCartLocally();
  cartRevision += 1;
  dispatchCartUpdated();
}

export function getCartRevision() {
  return cartRevision;
}

export function sanitizeCart(validProductIdsSet) {
  const originalCart = JSON.stringify(cart);
  const sanitizedCart = cart
    .filter((cartItem) => (
      cartItem &&
      typeof cartItem === 'object' &&
      cartItem.productId !== undefined &&
      cartItem.productId !== null &&
      String(cartItem.productId).trim() !== '' &&
      Number.isInteger(Number(cartItem.quantity)) &&
      Number(cartItem.quantity) > 0 &&
      (!validProductIdsSet || validProductIdsSet.has(String(cartItem.productId)))
    ))
    .map((cartItem) => ({
      ...cartItem,
      productId: String(cartItem.productId),
      quantity: Number(cartItem.quantity),
      deliveryOptionId: cartItem.deliveryOptionId || '1'
    }));

  cart.length = 0;
  cart.push(...sanitizedCart);
  if (JSON.stringify(cart) !== originalCart) {
    persistCartLocally();
  }
  return cart;
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (activeUserId !== user.uid) {
      setCartUser(user.uid);
    }
  } else if (activeUserId !== 'guest') {
    setCartUser(null);
  }
});

export function setCartFromCloud(cartData) {
  replaceCart(Array.isArray(cartData) ? cartData : [], true);
}

export async function saveCartToCloud() {
  localStorage.removeItem('cartClearedAt');
  activateCurrentUserCart();
  persistCartLocally();
  dispatchCartUpdated();

  if (auth.currentUser) {
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      cart,
      cartUpdatedAt: Date.now()
    }, { merge: true });
  }
}

function saveToStorage() {
  saveCartToCloud().catch((error) => {
    console.error('Could not save cart to Firestore.', error);
  });
}

export function addToCart(productId, quantity = 1) {
  activateCurrentUserCart();
  const normalizedProductId = String(productId);
  const normalizedQuantity = Number(quantity);
  if (!normalizedProductId || !Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
    throw new Error('A valid product and quantity are required.');
  }

  const matchingItem = cart.find((cartItem) => cartItem.productId === normalizedProductId);

  if (matchingItem) {
    matchingItem.quantity += normalizedQuantity;
  } else {
    cart.push({
      productId: normalizedProductId,
      quantity: normalizedQuantity,
      deliveryOptionId: '1'
    });
  }

  cartRevision += 1;
  saveToStorage();
}

export function removeFromCart(productId) {
  activateCurrentUserCart();
  const normalizedProductId = String(productId);
  const newCart = cart.filter((cartItem) => cartItem.productId !== normalizedProductId);
  cart.length = 0;
  cart.push(...newCart);
  cartRevision += 1;
  saveToStorage();
}

export async function clearCart() {
  activateCurrentUserCart();
  cart.length = 0;
  cartRevision += 1;
  localStorage.setItem('cart', JSON.stringify([]));
  localStorage.setItem(getCartStorageKey(), JSON.stringify([]));
  localStorage.setItem('cartUserId', activeUserId);
  localStorage.setItem('cartClearedAt', String(Date.now()));
  dispatchCartUpdated();

  if (auth.currentUser) {
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      cart: [],
      cartUpdatedAt: Date.now()
    }, { merge: true });
  }
}

export async function clearCartAfterOrder() {
  activateCurrentUserCart();
  cart.length = 0;
  cartRevision += 1;
  localStorage.setItem('cart', JSON.stringify([]));
  localStorage.setItem(getCartStorageKey(), JSON.stringify([]));
  localStorage.setItem('cartUserId', activeUserId);
  localStorage.setItem('cartClearedAt', String(Date.now()));
  dispatchCartUpdated();

  if (auth.currentUser) {
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        cart: [],
        cartUpdatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Could not clear the cart in Firestore after payment.', error);
      throw error;
    }
  }
}

export function updateQuantity(productId, quantity) {
  activateCurrentUserCart();
  const normalizedQuantity = Number(quantity);
  if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1) {
    throw new Error('Cart quantity must be a whole number greater than 0.');
  }

  const matchingItem = cart.find((cartItem) => cartItem.productId === String(productId));
  if (!matchingItem) {
    throw new Error(`Cart item not found: ${productId}`);
  }

  matchingItem.quantity = normalizedQuantity;
  cartRevision += 1;
  saveToStorage();
}

export function updateDeliveryOption(productId, deliveryOptionId) {
  activateCurrentUserCart();
  const matchingItem = cart.find((cartItem) => cartItem.productId === String(productId));
  if (!matchingItem) {
    throw new Error(`Cart item not found: ${productId}`);
  }

  matchingItem.deliveryOptionId = deliveryOptionId || '1';
  cartRevision += 1;
  saveToStorage();
}

export function loadCart(callback) {
  const xhr = new XMLHttpRequest();

  xhr.addEventListener('load', () => {
    console.log(xhr.response);
    callback();
  });

  xhr.open('GET', 'https://supersimplebackend.dev/cart');
  xhr.send();
}

window.addEventListener('storage', (event) => {
  if (event.key !== getCartStorageKey()) {
    return;
  }

  try {
    replaceCart(event.newValue ? JSON.parse(event.newValue) : [], false);
  } catch (error) {
    console.warn('Could not sync the saved cart from another tab.', error);
  }
});
