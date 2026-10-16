import { renderOrderSummary } from './checkout/orderSummary.js';
import { renderPaymentSummary } from './checkout/paymentSummary.js';
import { loadProductsFetch } from '../data/products.js';
import { setCartUser } from '../data/cart.js';
import { setOrdersUser } from '../data/orders.js';
import { auth, onAuthStateChanged } from './firebase.js';

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace('index.html');
    return;
  }

  setCartUser(user.uid);
  setOrdersUser(user.uid);

  try {
    await loadProductsFetch();
    renderOrderSummary();
    renderPaymentSummary();
  } catch (error) {
    console.error('Could not load checkout data.', error);
  }
});



/*
Promise.all([
loadProductsFetch(),
   
  new Promise((resolve) => {
   loadCart(() => {
   resolve();
   
   });  
  })
   
   
   
]).then((values) => {
   console.log(values);
   renderOrderSummary();
  renderPaymentSummary();     
}); 
*/

/*

new Promise((resolve) => {
  loadProducts(() => {
    resolve('value1');
  });
  
}).then((value) => {
   console.log(value);  
   
   
   return new Promise((resolve) => {
   loadCart(() => {
   resolve();
   
   });  
  }); 
  
}).then(() => {
  renderOrderSummary();
  renderPaymentSummary();       
});
*/

/*
loadProducts(() => {
 loadCart(() => {    
  renderOrderSummary();
  renderPaymentSummary();        
   }); 
});
*/


































