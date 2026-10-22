import {
  doc,
  getDoc,
  setDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { auth, db } from '../scripts/firebase.js';
import { cart, setCartFromCloud } from './cart.js';

let activeUserId = 'guest';

function loadOrders() {
  const storedOrders = localStorage.getItem(`orders_${activeUserId}`);
  return storedOrders ? JSON.parse(storedOrders) : [];
}

export let orders = loadOrders();

export function setOrdersUser(userId) {
  if (!userId) {
    throw new Error('A user ID is required to load customer orders.');
  }

  activeUserId = userId;
  orders = loadOrders();
}

export function setOrdersFromCloud(ordersData) {
  orders = ordersData;
  localStorage.setItem(`orders_${activeUserId}`, JSON.stringify(orders));
}

export async function syncUserDataFromCloud(user) {
  const userSnapshot = await getDoc(doc(db, 'users', user.uid));
  if (!userSnapshot.exists()) {
    return;
  }

  const userData = userSnapshot.data();
  const recentlyCleared =
    Date.now() - Number(localStorage.getItem('cartClearedAt') || 0) < 15000;

  if (recentlyCleared) {
    cart.length = 0;
    localStorage.setItem('cart', JSON.stringify([]));
    localStorage.setItem(`cart_${user.uid}`, JSON.stringify([]));
  } else if (Array.isArray(userData.cart)) {
    setCartFromCloud(userData.cart);
    if (userData.cart.length === 0) {
      localStorage.setItem('cart', JSON.stringify([]));
    }
  }

  if (Array.isArray(userData.orders)) {
    setOrdersFromCloud(userData.orders);
  }
}

export function addOrder(order) {
  orders.unshift(order);
  saveToStorage();
}

function saveToStorage() {
  localStorage.setItem(`orders_${activeUserId}`, JSON.stringify(orders));

  if (auth.currentUser) {
    setDoc(doc(db, 'users', auth.currentUser.uid), {
      orders,
      ordersUpdatedAt: new Date().toISOString()
    }, { merge: true }).catch((error) => {
      console.error('Could not save orders to Firestore.', error);
    });
  }
}


























































