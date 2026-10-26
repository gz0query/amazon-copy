import { db } from './firebase.js';
import { syncUserDataFromCloud } from '../data/orders.js';
import {
    DEFAULT_PRODUCTS,
    products,
    startRealtimeProductsSync
} from '../data/products.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import {
    addDoc,
    deleteDoc,
    doc,
    setDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

const auth = getAuth();
const adminContainer = document.getElementById('admin-container');
const form = document.getElementById('admin-product-form');
const imageInput = document.getElementById('product-image');
const imagePreview = document.getElementById('image-preview-box');
const formMessage = document.getElementById('admin-form-message');
const productList = document.getElementById('admin-product-list');
const productCount = document.getElementById('admin-product-count');
const searchInput = document.getElementById('admin-search-input');
let isAuthorizedAdmin = false;
let isProductListenerStarted = false;

onAuthStateChanged(auth, async (user) => {
    if (user && user.email?.toLowerCase() === 'goodluckbello85@gmail.com') {
        isAuthorizedAdmin = true;
        adminContainer.style.display = 'block';
        syncUserDataFromCloud(user).catch((error) => {
            console.error('Could not sync Admin user data.', error);
        });
        await renderAdminProducts();
        return;
    }

    isAuthorizedAdmin = false;
    alert('Unauthorized Access. Admin only.');
    window.location.href = 'index.html';
});

imageInput.addEventListener('input', () => {
    const imageUrl = imageInput.value.trim();

    imagePreview.hidden = !imageUrl;
    if (imageUrl) {
        imagePreview.src = imageUrl;
    } else {
        imagePreview.removeAttribute('src');
    }
});

imagePreview.addEventListener('error', () => {
    imagePreview.hidden = true;
});

imagePreview.addEventListener('load', () => {
    imagePreview.hidden = false;
});

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!isAuthorizedAdmin) {
        alert('Unauthorized Access. Admin only.');
        return;
    }

    const name = document.getElementById('product-name').value.trim();
    const priceInput = document.getElementById('product-price').value;
    const image = document.getElementById('product-image').value.trim();
    const ratingInput = document.getElementById('product-rating').value;
    const category = document.getElementById('product-category').value;
    const inStock = document.getElementById('product-stock').value === 'true';
    const priceCents = Math.round(parseFloat(priceInput) * 100);

    try {
        await addDoc(collection(db, 'products'), {
            name,
            priceCents,
            image,
            rating: { stars: parseFloat(ratingInput), count: 0 },
            category,
            inStock,
            isCustom: true,
            deleted: false,
            dateAdded: new Date().toISOString()
        });

        form.reset();
        imagePreview.hidden = true;
        imagePreview.removeAttribute('src');
        showFormMessage('Product added successfully!');
        await renderAdminProducts();
    } catch (error) {
        console.error('Unable to add product:', error);
        showFormMessage('Unable to add product. Please try again.', true);
    }
});

searchInput.addEventListener('input', () => {
    renderAdminProductRows(cachedAdminProducts);
});

let cachedAdminProducts = [];

async function renderAdminProducts() {
    const defaultIds = new Set(DEFAULT_PRODUCTS.map((product) => product.id));
    cachedAdminProducts = products.map((product) => ({
        ...product,
        isDefault: defaultIds.has(String(product.id)),
        firestoreDocumentId: String(product.id),
        inStock: product.inStock !== false
    }));
    renderAdminProductRows(cachedAdminProducts);

    if (isProductListenerStarted) {
        return;
    }

    startRealtimeProductsSync((mergedProducts, firestoreProducts = []) => {
        const firestoreByProductId = new Map();
        firestoreProducts.forEach((product) => {
            firestoreByProductId.set(product.id, product);
            firestoreByProductId.set(product.firestoreDocumentId, product);
        });

        cachedAdminProducts = mergedProducts.map((product) => {
            const override = firestoreByProductId.get(String(product.id));
            return {
                ...product,
                isDefault: defaultIds.has(String(product.id)),
                firestoreDocumentId: override?.firestoreDocumentId || String(product.id),
                inStock: product.inStock !== false
            };
        });
        renderAdminProductRows(cachedAdminProducts);
    });
    isProductListenerStarted = true;
}

function renderAdminProductRows(productsToRender) {
    productCount.textContent = String(cachedAdminProducts.length);

    const query = searchInput.value.trim().toLowerCase();
    const filteredProducts = productsToRender.filter((product) =>
        product.name.toLowerCase().includes(query)
    );

    if (filteredProducts.length === 0) {
        productList.replaceChildren(createListMessage(
            query ? 'No products match your search.' : 'No products found.'
        ));
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredProducts.forEach((product) => fragment.append(createProductRow(product)));
    productList.replaceChildren(fragment);
}

function createProductRow(product) {
    const row = document.createElement('article');
    row.className = 'admin-product-row';

    const image = document.createElement('img');
    image.className = 'admin-product-image';
    image.src = product.image || '';
    image.alt = product.name;

    const details = document.createElement('div');
    const name = document.createElement('h4');
    name.className = 'admin-product-name';
    name.textContent = product.name;

    const price = document.createElement('p');
    price.className = 'admin-product-price';
    price.textContent = `₦${(Number(product.priceCents) / 100).toFixed(2)}`;

    const stockBadge = document.createElement('span');
    stockBadge.className = `admin-stock-badge ${product.inStock ? 'in-stock' : 'sold-out'}`;
    stockBadge.textContent = product.inStock ? 'IN STOCK' : 'SOLD OUT';

    details.append(name, price, stockBadge);

    const actions = document.createElement('div');
    actions.className = 'admin-product-actions';

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.textContent = product.inStock ? 'Mark Sold Out' : 'Mark In Stock';
    toggleButton.addEventListener('click', () => toggleProductStock(product, toggleButton));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'admin-delete-button';
    deleteButton.textContent = 'Delete';
    deleteButton.addEventListener('click', () => deleteProduct(product, deleteButton));

    actions.append(toggleButton, deleteButton);
    row.append(image, details, actions);
    return row;
}

async function toggleProductStock(product, button) {
    if (!isAuthorizedAdmin) {
        return;
    }

    button.disabled = true;
    try {
        await setDoc(doc(db, 'products', product.firestoreDocumentId || String(product.id)), {
            id: String(product.id),
            name: product.name,
            priceCents: product.priceCents,
            image: product.image,
            rating: product.rating,
            inStock: !product.inStock,
            deleted: false,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error('Unable to update product stock:', error);
        button.disabled = false;
        alert('Unable to update stock status. Please try again.');
    }
}

async function deleteProduct(product, button) {
    if (!isAuthorizedAdmin || !confirm('Are you sure you want to delete this product?')) {
        return;
    }

    button.disabled = true;
    try {
        if (product.isDefault) {
            await setDoc(doc(db, 'products', product.firestoreDocumentId || product.id), {
                id: product.id,
                deleted: true
            }, { merge: true });
        } else {
            await deleteDoc(doc(db, 'products', product.firestoreDocumentId || product.id));
        }
    } catch (error) {
        console.error('Unable to delete product:', error);
        button.disabled = false;
        alert('Unable to delete product. Please try again.');
    }
}

function createListMessage(message) {
    const element = document.createElement('p');
    element.className = 'admin-list-message';
    element.textContent = message;
    return element;
}

function showFormMessage(message, isError = false) {
    formMessage.textContent = message;
    formMessage.classList.toggle('error', isError);
    formMessage.hidden = false;
}
