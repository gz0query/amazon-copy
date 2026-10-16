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

export function addOrder(order) {
  orders.unshift(order);
  saveToStorage();
}

function saveToStorage() {
  localStorage.setItem(`orders_${activeUserId}`, JSON.stringify(orders));
}





























































