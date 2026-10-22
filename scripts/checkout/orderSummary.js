
import {
  cart,
  removeFromCart,
  updateDeliveryOption,
  updateQuantity
} from '../../data/cart.js';
import {getProduct} from '../../data/products.js';
import {formatCurrency} from '../utils/money.js';
import {hello} from 'https://unpkg.com/supersimpledev@1.0.1/hello.esm.js';
import dayjs from  'https://unpkg.com/dayjs@1.11.10/esm/index.js';
import {deliveryOptions, getDeliveryOption} from '../../data/deliveryOptions.js';
import {renderPaymentSummary} from './paymentSummary.js';

export function renderOrderSummary() {
  let cartSummaryHTML = '';

  cart.forEach((cartItem) => {
    const matchingProduct = getProduct(cartItem.productId);
    if (!matchingProduct) return;

    const deliveryOption = getDeliveryOption(cartItem.deliveryOptionId);
    const deliveryDate = dayjs().add(deliveryOption.deliveryDays, 'days');
    const dateString = deliveryDate.format('dddd, MMMM D');

    cartSummaryHTML += `
      <div class="cart-item-container js-cart-item-container js-cart-item-container-${matchingProduct.id}">
        <div class="delivery-date">Delivery date: ${dateString}</div>
        <div class="cart-item-details-grid">
          <img class="product-image" src="${matchingProduct.image}">
          <div class="cart-item-details">
            <div class="product-name">${matchingProduct.name}</div>
            <div class="product-price">
              ₦${formatCurrency(matchingProduct.priceCents * cartItem.quantity)}
            </div>
            <div class="product-quantity js-product-quantity-${matchingProduct.id}">
              <span>Quantity: <span class="quantity-label">${cartItem.quantity}</span></span>
              <span
                class="update-quantity-link link-primary js-update-quantity-link"
                data-product-id="${matchingProduct.id}">
                Update
              </span>
              <span
                class="delete-quantity-link link-primary js-delete-link js-delete-link-${matchingProduct.id}"
                data-product-id="${matchingProduct.id}">
                Delete
              </span>
            </div>
          </div>
          <div class="delivery-options">
            <div class="delivery-options-title">Choose a delivery option:</div>
            ${deliveryOptionsHTML(matchingProduct, cartItem)}
          </div>
        </div>
      </div>
    `;
  });

  const orderSummaryElement = document.querySelector('.js-order-summary');
  orderSummaryElement.innerHTML = cartSummaryHTML;

  const totalCartQuantity = cart.reduce(
    (total, cartItem) =>
      getProduct(cartItem.productId) ? total + cartItem.quantity : total,
    0
  );
  const itemCountElement = document.querySelector('.js-return-to-home-link');
  if (itemCountElement) {
    itemCountElement.textContent = `${totalCartQuantity} items`;
  }

  document.querySelectorAll('.js-update-quantity-link').forEach((link) => {
    link.addEventListener('click', () => {
      const { productId } = link.dataset;
      const cartItem = cart.find((item) => item.productId === productId);
      const quantityElement = document.querySelector(
        `.js-product-quantity-${productId}`
      );

      quantityElement.innerHTML = `
        <label>
          Quantity:
          <input
            class="js-quantity-input"
            type="number"
            min="1"
            step="1"
            value="${cartItem.quantity}">
        </label>
        <button class="js-save-quantity-button" type="button">Save</button>
        <button class="js-cancel-quantity-button" type="button">Cancel</button>
        <span class="js-quantity-update-error" role="alert"></span>
      `;

      const quantityInput = quantityElement.querySelector('.js-quantity-input');

      quantityElement
        .querySelector('.js-save-quantity-button')
        .addEventListener('click', () => {
          const quantity = Number(quantityInput.value);
          if (!Number.isInteger(quantity) || quantity < 1) {
            quantityElement.querySelector('.js-quantity-update-error').textContent =
              'Enter a whole number greater than 0.';
            quantityInput.focus();
            return;
          }

          updateQuantity(productId, quantity);
          renderOrderSummary();
          renderPaymentSummary();
        });

      quantityElement
        .querySelector('.js-cancel-quantity-button')
        .addEventListener('click', renderOrderSummary);
    });
  });

  document.querySelectorAll('.js-delete-link').forEach((link) => {
    link.addEventListener('click', () => {
      removeFromCart(link.dataset.productId);
      renderOrderSummary();
      renderPaymentSummary();
    });
  });

  document.querySelectorAll('.js-delivery-option').forEach((element) => {
    element.addEventListener('click', () => {
      const { productId, deliveryOptionId } = element.dataset;
      updateDeliveryOption(productId, deliveryOptionId);
      renderOrderSummary();
      renderPaymentSummary();
    });
  });
}

function deliveryOptionsHTML(matchingProduct, cartItem) {
  return deliveryOptions.map((deliveryOption) => {
    const deliveryDate = dayjs().add(deliveryOption.deliveryDays, 'days');
    const dateString = deliveryDate.format('dddd, MMMM D');
    const priceString = deliveryOption.priceCents === 0
      ? 'FREE'
      : `₦${formatCurrency(deliveryOption.priceCents)} -`;
    const isChecked = deliveryOption.id === cartItem.deliveryOptionId;

    return `
      <div
        class="delivery-option js-delivery-option"
        data-product-id="${matchingProduct.id}"
        data-delivery-option-id="${deliveryOption.id}">
        <input
          type="radio"
          ${isChecked ? 'checked' : ''}
          class="delivery-option-input"
          name="delivery-option-${matchingProduct.id}">
        <div>
          <div class="delivery-option-date">${dateString}</div>
          <div class="delivery-option-price">${priceString} Shipping</div>
        </div>
      </div>
    `;
  }).join('');
}






































































