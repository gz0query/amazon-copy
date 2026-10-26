
import { cart, clearCartAfterOrder, sanitizeCart } from '../../data/cart.js';
import { getProduct, products } from '../../data/products.js'
import { getDeliveryOption } from '../../data/deliveryOptions.js';
import { formatCurrency } from '../utils/money.js'
import { addOrder } from '../../data/orders.js';
import { auth } from '../firebase.js';

const PAYSTACK_PUBLIC_KEY = 'pk_test_f53017bd83254a994991398744fe3b5f5a4da717';

export function renderPaymentSummary() {
  sanitizeCart(new Set(products.map((product) => String(product.id))));
  let productPriceCents = 0;
  let shippingPriceCents = 0;


  cart.forEach((cartItem) => {
    const product = getProduct(cartItem.productId);
    if (!product) return;

    productPriceCents += product.priceCents * cartItem.quantity;

    const deliveryOption =
      getDeliveryOption(cartItem.deliveryOptionId) || getDeliveryOption('1');
    shippingPriceCents += deliveryOption.priceCents;
  });

  const totalBeforeTaxCents = productPriceCents + shippingPriceCents;
  const taxCents = totalBeforeTaxCents * 0.1;
  const totalCents = totalBeforeTaxCents + taxCents;
  const totalCartQuantity = cart.reduce(
    (total, cartItem) =>
      getProduct(cartItem.productId) ? total + cartItem.quantity : total,
    0
  );

  const paymentSummaryHTML = `
   
    <div class="payment-summary-title">
            Order Summary
        </div>

    <div class="payment-summary-row">
       <div>Items (${totalCartQuantity}):</div>
       
    <div class="payment-summary-money">
 ₦${formatCurrency(productPriceCents)}</div>
          </div>

     <div class="payment-summary-row">
    <div>Shipping &amp; handling:</div>
    
     <div class="payment-summary-money">
  ₦${formatCurrency(shippingPriceCents)}
         </div>
          </div>

    <div class="payment-summary-row subtotal-row">
   <div>Total before tax:</div>
   <div class="payment-summary-money">
  ₦${formatCurrency(totalBeforeTaxCents)}
         </div>
          </div>

    <div class="payment-summary-row">
    <div>Estimated tax (10%):</div>
   <div class="payment-summary-money">
  ₦${formatCurrency(taxCents)}
        </div>  
          </div>

    <div class="payment-summary-row total-row">
      <div>Order total:</div>
  <div class="payment-summary-money">
    ₦${formatCurrency(totalCents)}</div>
          </div>

  <button class="place-order-button button-primary js-place-order">
            Place your order
          </button>
   
   `;

  document.querySelector('.js-payment-summary')
    .innerHTML = paymentSummaryHTML;

  document.querySelector('.js-place-order')
    .addEventListener('click', async (event) => {
      event.preventDefault();
      if (cart.length === 0 || totalCents <= 0) {
        return;
      }

      const userEmail = auth.currentUser?.email || 'goodluckbello85@gmail.com';
      const finalizeOrderAfterPayment = async (paymentReference) => {
        const placedAt = new Date();
        const newOrder = {
          orderId: crypto.randomUUID(),
          orderDate: new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }).format(placedAt),
          placedAt: placedAt.toISOString(),
          orderTime: placedAt.toISOString(),
          totalCents,
          totalCostCents: totalCents,
          paymentReference,
          items: cart.map((cartItem) => ({ ...cartItem }))
        };

        try {
          await addOrder(newOrder);
          await clearCartAfterOrder();
          window.location.href = 'orders.html';
        } catch (error) {
          console.error('Could not finalize the paid order.', error);
          alert('Payment succeeded, but saving your order failed. Contact support with your payment reference.');
        }
      };

      if (window.PaystackPop) {
        const handler = window.PaystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: userEmail,
          amount: Math.max(100, Math.round(totalCents)),
          currency: 'NGN',
          ref: 'BYPAY_' + Date.now(),
          callback: function (response) {
            finalizeOrderAfterPayment(response.reference);
          },
          onClose: function () { }
        });
        handler.openIframe();
      } else {
        alert('Payment gateway is loading. Please check your internet connection and try again.');
        return;
      }
    });

}




















































