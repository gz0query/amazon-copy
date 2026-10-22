import { formatCurrency } from '../scripts/utils/money.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { db } from '../scripts/firebase.js';

export function getProduct(productId) {
  let matchingProduct;

  products.forEach((product) => {
    if (product.id === productId) {
      matchingProduct = product;
    }
  });

  return matchingProduct;
}

class Product {
  id;
  image;
  name;
  rating;
  priceCents;
  inStock;
  keywords;
  category;
  deleted;

  constructor(productDetails) {
    this.id = productDetails.id;
    this.image = productDetails.image;
    this.name = productDetails.name;
    this.rating = productDetails.rating;
    this.priceCents = productDetails.priceCents;
    this.inStock = productDetails.inStock;
    this.keywords = productDetails.keywords;
    this.category = productDetails.category;
    this.deleted = productDetails.deleted;
  }

  getStarsUrl() {
    return `images/ratings/rating-${this.rating.stars * 10}.png`;
  }

  getPrice() {
    return `₦${formatCurrency(this.priceCents)}`;
  }

  extraInfoHTML() {
    return '';
  }
}

class Clothing extends Product {
  sizeChartLink;

  constructor(productDetails) {
    super(productDetails);
    this.sizeChartLink = productDetails.sizeChartLink;
  }

  extraInfoHTML() {
    return `
      <a href="${this.sizeChartLink}" target="_blank">
        Size chart
      </a>
    `;
  }
}

export let products = [];

function normalizeProductDetails(productDetails) {
  return {
    ...productDetails,
    id: String(productDetails.id),
    image: productDetails.image || 'images/products/placeholder.png',
    name: productDetails.name || 'Unnamed Product',
    rating: {
      stars: Number(productDetails.rating?.stars ?? 4.5),
      count: Number(productDetails.rating?.count ?? 0)
    },
    priceCents: Number(productDetails.priceCents ?? 0),
    keywords: Array.isArray(productDetails.keywords)
      ? productDetails.keywords
      : [productDetails.category || 'general'],
    category: productDetails.category || 'Other',
    inStock: productDetails.inStock !== false,
    deleted: productDetails.deleted === true
  };
}

export function createProduct(productDetails) {
  const normalizedProduct = normalizeProductDetails(productDetails);
  if (normalizedProduct.type === 'clothing' || normalizedProduct.sizeChartLink) {
    return new Clothing(normalizedProduct);
  }
  return new Product(normalizedProduct);
}

export function setProducts(productsData) {
  products = productsData
    .filter((product) => product.deleted !== true)
    .map(createProduct);
}

export async function loadFirestoreProducts() {
  const snapshot = await getDocs(collection(db, 'products'));

  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    const normalizedProduct = normalizeProductDetails({
      ...data,
      id: String(docSnap.id)
    });

    const existingProductIndex = products.findIndex(
      (product) => String(product.id) === normalizedProduct.id
    );

    if (normalizedProduct.deleted) {
      if (existingProductIndex !== -1) {
        products.splice(existingProductIndex, 1);
      }
      return;
    }

    const product = new Product(normalizedProduct);
    if (existingProductIndex !== -1) {
      Object.assign(products[existingProductIndex], product);
    } else {
      products.unshift(product);
    }
  });
}

export function loadProductsFetch() {
  const promise = fetch('https://supersimplebackend.dev/products')
    .then((response) => {
      return response.json();
    })
    .then((productsData) => {
      setProducts(productsData);

      console.log('load products');
    })
    .catch((error) => {
      console.log('unexpected error. please try again later.', error);
    });

  return promise;
}

export function loadProducts(fun) {
  const xhr = new XMLHttpRequest();

  xhr.addEventListener('load', () => {
    setProducts(JSON.parse(xhr.response));

    console.log('load products');

    if (typeof fun === 'function') {
      fun();
    }
  });

  xhr.addEventListener('error', (error) => {
    console.log('unexpected error. please try again later.', error);
    // Fallback: If network request fails, populate using local array
    setProducts(defaultProducts);
    if (typeof fun === 'function') {
      fun();
    }
  });

  // Fixed the extra dot in the URL
  xhr.open('GET', 'https://supersimplebackend.dev/products');
  xhr.send();
}

// Fallback local products list if backend fetch is offline or blocked
export const defaultProducts = [
  {
    id: "e43638ce-6aa0-4b85-b27f-e1d07eb678c6",
    image: "images/products/athletic-cotton-socks-6-pairs.jpg",
    name: "Black and Gray Athletic Cotton Socks - 6 Pairs",
    rating: { stars: 4.5, count: 87 },
    priceCents: 1090
  },
  {
    id: "15b6fc6f-327a-4ec4-896f-486349e85a3d",
    image: "images/products/intermediate-composite-basketball.jpg",
    name: "Intermediate Size Basketball",
    rating: { stars: 4, count: 127 },
    priceCents: 2095
  },
  {
    id: "83d4ca15-0f35-48f5-b7a3-1ea210004f2e",
    image: "images/products/adults-plain-cotton-tshirt-2-pack-teal.jpg",
    name: "Adults Plain Cotton T-Shirt - 2 Pack",
    rating: { stars: 4.5, count: 56 },
    priceCents: 799,
    type: "clothing",
    sizeChartLink: "images/clothing-size-chart.png"
  }
];