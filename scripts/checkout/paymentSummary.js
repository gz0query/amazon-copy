
import {cart, clearCart} from '../../data/cart.js';
import {getProduct} from '../../data/products.js'
import {getDeliveryOption} from '../../data/deliveryOptions.js';
import {formatCurrency} from '../utils/money.js'
import {addOrder} from '../../data/orders.js';

export function renderPaymentSummary() {
  let productPriceCents = 0;
  let shippingPriceCents = 0;


   cart.forEach((cartItem) => {
     const product = getProduct(cartItem.productId);
     productPriceCents += product.priceCents * cartItem.quantity;

     const deliveryOption = getDeliveryOption(cartItem.deliveryOptionId);
     shippingPriceCents += deliveryOption.priceCents;
   });
   
   const totalBeforeTaxCents = productPriceCents + shippingPriceCents;
   const taxCents = totalBeforeTaxCents * 0.1;
   const totalCents = totalBeforeTaxCents + taxCents;
   const totalCartQuantity = cart.reduce(
     (total, cartItem) => total + cartItem.quantity,
     0
   );
   
   const paymentSummaryHTML = `
   
    <div class="payment-summary-title">
            Order Summary
        </div>

    <div class="payment-summary-row">
       <div>Items (${totalCartQuantity}):</div>
       
    <div class="payment-summary-money">
 $${formatCurrency(productPriceCents)}</div>
          </div>

     <div class="payment-summary-row">
    <div>Shipping &amp; handling:</div>
    
     <div class="payment-summary-money">
  $${formatCurrency(shippingPriceCents)}
         </div>
          </div>

    <div class="payment-summary-row subtotal-row">
   <div>Total before tax:</div>
   <div class="payment-summary-money">
  $${formatCurrency(totalBeforeTaxCents)}
         </div>
          </div>

    <div class="payment-summary-row">
    <div>Estimated tax (10%):</div>
   <div class="payment-summary-money">
  $${formatCurrency(taxCents)}
        </div>  
          </div>

    <div class="payment-summary-row total-row">
      <div>Order total:</div>
  <div class="payment-summary-money">
    $${formatCurrency(totalCents)}</div>
          </div>

  <button class="place-order-button button-primary js-place-order">
            Place your order
          </button>
   
   `;
   
 document.querySelector('.js-payment-summary')
 .innerHTML = paymentSummaryHTML;
 
 document.querySelector('.js-place-order')
 .addEventListener('click', (event) => {
   if (cart.length === 0) {
     return;
   }

   event.currentTarget.disabled = true;
   const placedAt = new Date();
   const order = {
     orderId: crypto.randomUUID(),
     orderDate: new Intl.DateTimeFormat('en-US', {
       year: 'numeric',
       month: 'long',
       day: 'numeric'
     }).format(placedAt),
     placedAt: placedAt.toISOString(),
     totalCostCents: totalCents,
     items: cart.map((cartItem) => ({ ...cartItem }))
   };

   addOrder(order);
   clearCart();
   window.location.href = 'orders.html';
 });
 
}

























































