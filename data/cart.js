   
 export let cart;
 let activeUserId = 'guest';

 loadFromStorage();

 export function loadFromStorage() {
   const storedCart = localStorage.getItem(`cart_${activeUserId}`);
   cart = storedCart ? JSON.parse(storedCart) : [];
 }

 export function setCartUser(userId) {
   if (!userId) {
     throw new Error('A user ID is required to load a customer cart.');
   }

   activeUserId = userId;
   loadFromStorage();
 }

 function saveToStorage() {
   localStorage.setItem(`cart_${activeUserId}`, JSON.stringify(cart));
 }
  
  export function addToCart(productId, quantity = 1) {
 
   let matchingItem;
   
   cart.forEach((cartItem) => {
     if (productId === cartItem.productId) {
        matchingItem = cartItem;
     }
   });
   
   if (matchingItem) {
      matchingItem.quantity += quantity;
   } else {
   cart.push({
   productId: productId,
   quantity: quantity,
   deliveryOptionId: '1'
  });
   }
   
   saveToStorage();
 }
 
export function removeFromCart(productId) {
    const newCart = [];
    
    cart.forEach((cartItem) => {
      if (cartItem.productId !== productId) {
        newCart.push(cartItem);
      }
      
    });
    
    cart = newCart;
    
    saveToStorage();
 }

export function clearCart() {
  cart = [];
  saveToStorage();
}

export function updateQuantity(productId, quantity) {
  const matchingItem = cart.find(
    (cartItem) => cartItem.productId === productId
  );

  if (!matchingItem) {
    throw new Error(`Cart item not found: ${productId}`);
  }

  matchingItem.quantity = quantity;
  saveToStorage();
}
   
   
export function updateDeliveryOption
(productId, deliveryOptionId) {
  
    let matchingItem;
   
   cart.forEach((cartItem) => {
     if (productId === cartItem.productId) {
        matchingItem = cartItem;
        
     }
   });
   
  if (!matchingItem) {
    throw new Error(`Cart item not found: ${productId}`);
  }

  matchingItem.deliveryOptionId = deliveryOptionId;
   
   saveToStorage();
   
  }
   
   
   
  export function loadCart(fun) {
  const xhr = new XMLHttpRequest()
  
  xhr.addEventListener('load', () => {
   console.log(xhr.response);
     
   fun();
   
  });
  
  xhr.open('GET', 'https://supersimplebackend.dev/cart');
  xhr.send();
}

   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
    
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
   
