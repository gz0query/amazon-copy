import { orders } from '../data/orders.js';
import { getProduct, loadProducts } from '../data/products.js';
import { getDeliveryOption } from '../data/deliveryOptions.js';

const searchParams = new URL(window.location.href).searchParams;
const orderId = searchParams.get('orderId');
const productId = searchParams.get('productId');

loadProducts(renderTracking);

function renderTracking() {
  const trackingContainer = document.querySelector('.js-order-tracking');
  const order = orders.find(
    (savedOrder) => (savedOrder.orderId || savedOrder.id) === orderId
  );

  if (!order) {
    showTrackingError(trackingContainer, 'Order not found.');
    return;
  }

  const orderItems = order.items || order.products;
  const item = orderItems?.find((orderItem) => orderItem.productId === productId);
  if (!item) {
    showTrackingError(trackingContainer, 'Product not found in this order.');
    return;
  }

  const product = getProduct(productId);
  if (!product) {
    showTrackingError(trackingContainer, 'Product details could not be loaded.');
    return;
  }

  const orderDate = new Date(order.placedAt || order.orderTime || order.orderDate);
  const deliveryDate = item.estimatedDeliveryTime
    ? new Date(item.estimatedDeliveryTime)
    : new Date(orderDate);

  if (!item.estimatedDeliveryTime) {
    const deliveryOption = getDeliveryOption(item.deliveryOptionId);
    deliveryDate.setDate(deliveryDate.getDate() + deliveryOption.deliveryDays);
  }

  if (Number.isNaN(orderDate.getTime()) || Number.isNaN(deliveryDate.getTime())) {
    showTrackingError(trackingContainer, 'Order delivery dates are invalid.');
    return;
  }

  const dateString = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }).format(deliveryDate);

  trackingContainer.querySelector('.js-delivery-date').textContent =
    `Arriving on ${dateString}`;
  trackingContainer.querySelector('.js-product-name').textContent = product.name;
  trackingContainer.querySelector('.js-product-quantity').textContent =
    `Quantity: ${item.quantity}`;

  const productImage = trackingContainer.querySelector('.js-product-image');
  productImage.src = product.image;
  productImage.alt = product.name;

  const totalDuration = deliveryDate.getTime() - orderDate.getTime();
  const elapsedDuration = Date.now() - orderDate.getTime();
  const progress = totalDuration <= 0
    ? 100
    : Math.min(100, Math.max(0, (elapsedDuration / totalDuration) * 100));
  trackingContainer.querySelector('.progress-bar').style.width = `${progress}%`;

  const statusIndex = progress >= 100 ? 2 : progress >= 33 ? 1 : 0;
  trackingContainer.querySelectorAll('.progress-label').forEach((label, index) => {
    label.classList.toggle('current-status', index === statusIndex);
  });
}

function showTrackingError(container, message) {
  container.querySelector('.order-tracking').textContent = message;
}
