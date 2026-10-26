import {
  doc,
  onSnapshot,
  setDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { auth, db, onAuthStateChanged } from '../scripts/firebase.js';
import { getProduct } from './products.js';
import {
  cart,
  setCartFromCloud,
  setCartUser
} from './cart.js';

let activeUserId = 'guest';
let ordersRevision = 0;
let realtimeUserId;
let stopUserSnapshot;
let userSnapshotPromise;

function loadOrders() {
  try {
    const storedOrders = localStorage.getItem(`orders_${activeUserId}`);
    const parsedOrders = storedOrders ? JSON.parse(storedOrders) : [];
    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch (error) {
    console.warn('Could not load saved orders.', error);
    return [];
  }
}

export let orders = loadOrders();

export function setOrdersUser(userId) {
  if (!userId) {
    activeUserId = 'guest';
    orders.length = 0;
    localStorage.removeItem('orders');
    localStorage.removeItem('ordersUserId');
    dispatchOrdersUpdated();
    return orders;
  }

  activeUserId = String(userId);
  orders.length = 0;
  orders.push(...loadOrders());
  persistOrdersLocally();
  dispatchOrdersUpdated();
  return orders;
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    if (activeUserId !== user.uid) {
      setOrdersUser(user.uid);
    }
  } else if (activeUserId !== 'guest') {
    stopRealtimeUserSync();
    setOrdersUser(null);
  }
});

export function getOrdersRevision() {
  return ordersRevision;
}

export function setOrdersFromCloud(ordersData) {
  orders.length = 0;
  orders.push(...(Array.isArray(ordersData) ? ordersData : []));
  persistOrdersLocally();
  dispatchOrdersUpdated();
}

function dispatchOrdersUpdated() {
  window.dispatchEvent(new CustomEvent('bypay-orders-updated'));
}

function persistOrdersLocally() {
  const serializedOrders = JSON.stringify(orders);
  localStorage.setItem(`orders_${activeUserId}`, serializedOrders);
  localStorage.setItem('orders', serializedOrders);
  localStorage.setItem('ordersUserId', activeUserId);
}

function updateUserPage(user, userData) {
  const name = userData.name || userData.fullName || userData.displayName ||
    user.displayName || user.email?.split('@')[0] || 'User';
  const firstName = name.trim().split(/\s+/)[0];
  const photo = userData.photoBase64 || user.photoURL || '';

  document.querySelectorAll(
    '#header-avatar, #sidebar-avatar, #profile-preview, .profile-avatar'
  ).forEach((avatar) => {
    if (photo) {
      avatar.src = photo;
    }
  });
  document.querySelectorAll('.greeting-text').forEach((greeting) => {
    const helloPrefix = document.createElement('span');
    helloPrefix.className = 'hello-prefix';
    helloPrefix.textContent = 'Hello, ';
    const firstNameElement = document.createElement('span');
    firstNameElement.className = 'first-name-only';
    firstNameElement.textContent = firstName;
    greeting.replaceChildren(helloPrefix, firstNameElement);
  });
  ['#sidebar-greeting', '#sidebar-name'].forEach((selector) => {
    const greeting = document.querySelector(selector);
    if (greeting) {
      greeting.textContent = `Hello, ${firstName}`;
    }
  });

  const profileName = document.querySelector('#profile-name');
  if (profileName && (userData.name || userData.fullName || userData.displayName)) {
    profileName.value = userData.name || userData.fullName || userData.displayName;
  }
  const profilePhone = document.querySelector('#profile-phone');
  if (profilePhone && userData.phone !== undefined) {
    profilePhone.value = userData.phone || '';
  }
  const profileAddress = document.querySelector('#profile-address');
  if (profileAddress && userData.address !== undefined) {
    profileAddress.value = userData.address || '';
  }
  document.querySelectorAll('.js-cart-quantity, .cart-quantity').forEach((badge) => {
    badge.textContent = String(cart.reduce(
      (total, item) => total + (getProduct(item.productId) ? Number(item.quantity) || 0 : 0),
      0
    ));
  });
}

export function startRealtimeUserSync(user) {
  if (!user?.uid) {
    return Promise.resolve();
  }
  if (realtimeUserId === user.uid && userSnapshotPromise) {
    return userSnapshotPromise;
  }

  setCartUser(user.uid);
  setOrdersUser(user.uid);
  stopUserSnapshot?.();
  realtimeUserId = user.uid;
  userSnapshotPromise = new Promise((resolve, reject) => {
    let isInitialSnapshot = true;
    stopUserSnapshot = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const userData = snapshot.exists() ? snapshot.data() : {};
      const clearedAt = Number(localStorage.getItem('cartClearedAt') || 0);
      if (Date.now() - clearedAt < 30000) {
        setCartFromCloud([]);
      } else {
        setCartFromCloud(Array.isArray(userData.cart) ? userData.cart : []);
      }
      setOrdersFromCloud(Array.isArray(userData.orders) ? userData.orders : []);
      updateUserPage(user, userData);
      window.dispatchEvent(new CustomEvent('bypay-user-updated', {
        detail: { user, userData }
      }));

      if (isInitialSnapshot) {
        isInitialSnapshot = false;
        resolve(userData);
      }
    }, (error) => {
      if (isInitialSnapshot) {
        isInitialSnapshot = false;
        reject(error);
      } else {
        console.error('Could not listen for user updates.', error);
      }
    });
  });
  return userSnapshotPromise;
}

export function stopRealtimeUserSync() {
  stopUserSnapshot?.();
  stopUserSnapshot = undefined;
  realtimeUserId = undefined;
  userSnapshotPromise = undefined;
}

export function syncUserDataFromCloud(user) {
  return startRealtimeUserSync(user);
}

export async function addOrder(order) {
  orders.unshift(order);
  ordersRevision += 1;
  persistOrdersLocally();
  dispatchOrdersUpdated();

  if (auth.currentUser) {
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      orders: orders.map((savedOrder) => ({ ...savedOrder })),
      ordersUpdatedAt: Date.now()
    }, { merge: true });
  }
}

window.addEventListener('storage', (event) => {
  if (event.key !== `orders_${activeUserId}`) {
    return;
  }

  try {
    orders.length = 0;
    orders.push(...(event.newValue ? JSON.parse(event.newValue) : []));
    dispatchOrdersUpdated();
  } catch (error) {
    console.warn('Could not sync saved orders from another tab.', error);
  }
});
