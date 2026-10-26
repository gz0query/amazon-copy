import { products, getProduct, loadFirestoreProducts } from '../data/products.js';
import { cart } from '../data/cart.js';
import { orders } from '../data/orders.js';

const WHATSAPP_NUMBER = '2348105724116';
const stopWords = new Set([
    'a', 'an', 'and', 'are', 'available', 'check', 'do', 'find', 'for', 'have',
    'in', 'is', 'item', 'items', 'me', 'of', 'please', 'product', 'products',
    'show', 'stock', 'the', 'what', 'with', 'you'
]);

const style = document.createElement('style');
style.textContent = `
	#bypay-chat-launcher {
		position: fixed;
		bottom: 24px;
		right: 24px;
		z-index: 9999;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: #00A8E1;
		color: #fff;
		border: none;
		box-shadow: 0 6px 20px rgba(0,0,0,0.18);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	#bypay-chat-window {
		position: fixed;
		bottom: 92px;
		right: 24px;
		z-index: 9999;
		width: 360px;
		max-width: calc(100vw - 32px);
		height: 500px;
		max-height: 78vh;
		border-radius: 12px;
		background: #fff;
		border: 1px solid #e5e7eb;
		box-shadow: 0 16px 36px rgba(0,0,0,0.16);
		display: none;
		flex-direction: column;
		overflow: hidden;
		font-family: Arial, sans-serif;
		color: #17212b;
	}
	#bypay-chat-window * { box-sizing: border-box; }
	.bypay-chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 14px 16px;
		color: #fff;
		background: #131921;
	}
	.bypay-chat-title { margin: 0; font-size: 15px; font-weight: 700; }
	.bypay-chat-subtitle { margin: 4px 0 0; color: #d1d5db; font-size: 11px; }
	.bypay-chat-close, .bypay-chat-send {
		display: grid;
		place-items: center;
		flex: 0 0 auto;
		border: 0;
		cursor: pointer;
	}
	.bypay-chat-close { padding: 5px; color: #fff; background: transparent; }
	.bypay-chat-whatsapp {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 12px;
		color: #fff;
		background: #1f883d;
		font-size: 12px;
		font-weight: 700;
		text-align: center;
		text-decoration: none;
	}
	#bypay-chat-messages {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 10px;
		overflow-y: auto;
		padding: 14px;
		background: #f8fafc;
	}
	.bypay-chat-bubble {
		max-width: 94%;
		padding: 10px 12px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: #fff;
		font-size: 13px;
		line-height: 1.45;
		overflow-wrap: anywhere;
	}
	.bypay-chat-user { align-self: flex-end; background: #e8f6fc; border-color: #b8e4f4; }
	.bypay-chat-actions { display: grid; gap: 7px; }
	.bypay-chat-quick {
		padding: 8px 10px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		color: #17212b;
		background: #fff;
		text-align: left;
		font: inherit;
		font-size: 12px;
		cursor: pointer;
	}
	.bypay-chat-quick:hover, .bypay-chat-link:hover { background: #eef6f9; }
	.bypay-chat-results { display: grid; gap: 8px; width: 100%; }
	.bypay-chat-product {
		display: grid;
		grid-template-columns: 58px minmax(0, 1fr);
		gap: 10px;
		align-items: center;
		padding: 8px;
		border: 1px solid #e5e7eb;
		border-radius: 6px;
		background: #fff;
	}
	.bypay-chat-product img { width: 58px; height: 58px; object-fit: contain; }
	.bypay-chat-product-name { margin: 0 0 4px; font-size: 12px; font-weight: 600; line-height: 1.3; }
	.bypay-chat-product-price { margin: 0; font-size: 12px; font-weight: 700; }
	.bypay-chat-stock { display: inline-block; margin-top: 4px; color: #16743a; font-size: 10px; font-weight: 700; }
	.bypay-chat-stock.sold-out { color: #b42318; }
	.bypay-chat-link {
		display: inline-flex;
		align-items: center;
		min-height: 34px;
		margin: 3px 5px 0 0;
		padding: 7px 10px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		color: #115e78;
		background: #fff;
		font-size: 12px;
		font-weight: 600;
		text-decoration: none;
	}
	#bypay-chat-form {
		display: flex;
		gap: 8px;
		padding: 10px;
		border-top: 1px solid #e5e7eb;
		background: #fff;
	}
	#bypay-chat-input {
		min-width: 0;
		flex: 1;
		height: 40px;
		padding: 0 10px;
		border: 1px solid #cbd5e1;
		border-radius: 6px;
		color: #17212b;
		font: inherit;
		font-size: 12px;
	}
	.bypay-chat-send { width: 40px; height: 40px; border-radius: 6px; color: #fff; background: #00A8E1; }
	@media (max-width: 420px) {
		#bypay-chat-window { right: 16px; bottom: 88px; max-height: calc(100vh - 120px); }
		#bypay-chat-launcher { right: 16px; bottom: 16px; }
	}
`;
document.head.append(style);

const launcher = document.createElement('button');
launcher.id = 'bypay-chat-launcher';
launcher.type = 'button';
launcher.setAttribute('aria-label', 'Open Bypay customer support');
launcher.setAttribute('aria-expanded', 'false');
launcher.innerHTML = `
	<svg viewBox="0 0 24 24" width="25" height="25" fill="none" aria-hidden="true">
		<path d="M12 3.25a8.75 8.75 0 0 0-7.42 13.39L3.5 21l4.52-1.06A8.75 8.75 0 1 0 12 3.25Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
		<path d="M8.35 8.7c.2-.45.42-.46.65-.47h.55c.18 0 .38.04.53.4l.74 1.77c.09.21.06.4-.08.58l-.5.61c-.15.17-.15.35-.02.56.47.78 1.15 1.43 1.95 1.88.2.11.38.1.54-.08l.64-.74c.17-.2.37-.23.59-.14l1.7.8c.23.1.36.23.36.42 0 .25-.12 1.13-.7 1.57-.48.37-1.1.55-1.78.4-.5-.12-1.15-.34-1.98-.77-1.4-.73-2.56-1.86-3.3-3.2-.4-.72-.75-1.65-.73-2.24.02-.6.25-1.12.64-1.55Z" fill="currentColor"/>
	</svg>
`;

const chatWindow = document.createElement('section');
chatWindow.id = 'bypay-chat-window';
chatWindow.setAttribute('role', 'dialog');
chatWindow.setAttribute('aria-label', 'Bypay Customer Support');
chatWindow.innerHTML = `
	<header class="bypay-chat-header">
		<div>
			<h2 class="bypay-chat-title">Bypay Customer Support</h2>
			<p class="bypay-chat-subtitle">Automated Product &amp; Order Assistant</p>
		</div>
		<button class="bypay-chat-close" type="button" aria-label="Close support chat">
			<svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
				<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
			</svg>
		</button>
	</header>
	<a class="bypay-chat-whatsapp" target="_blank" rel="noopener noreferrer">
		<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true">
			<path d="M12 3.25a8.75 8.75 0 0 0-7.42 13.39L3.5 21l4.52-1.06A8.75 8.75 0 1 0 12 3.25Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
			<path d="M8.35 8.7c.2-.45.42-.46.65-.47h.55c.18 0 .38.04.53.4l.74 1.77c.09.21.06.4-.08.58l-.5.61c-.15.17-.15.35-.02.56.47.78 1.15 1.43 1.95 1.88.2.11.38.1.54-.08l.64-.74c.17-.2.37-.23.59-.14l1.7.8c.23.1.36.23.36.42 0 .25-.12 1.13-.7 1.57-.48.37-1.1.55-1.78.4-.5-.12-1.15-.34-1.98-.77-1.4-.73-2.56-1.86-3.3-3.2-.4-.72-.75-1.65-.73-2.24.02-.6.25-1.12.64-1.55Z" fill="currentColor"/>
		</svg>
		<span>Connect with Live Support on WhatsApp</span>
	</a>
	<div id="bypay-chat-messages" aria-live="polite" aria-relevant="additions">
		<div class="bypay-chat-bubble">Welcome to Bypay Support. I can help you find products, check prices, review your cart or orders, and explain payment and shipping.</div>
		<div class="bypay-chat-actions">
			<button class="bypay-chat-quick" type="button" data-action="availability">Check Product Availability</button>
			<button class="bypay-chat-quick" type="button" data-action="lowest">Lowest Priced Items</button>
			<button class="bypay-chat-quick" type="button" data-action="status">Cart &amp; Order Status</button>
			<button class="bypay-chat-quick" type="button" data-action="policy">Payment &amp; Shipping Policy</button>
			<button class="bypay-chat-quick" type="button" data-action="human">Contact Human Agent</button>
		</div>
	</div>
	<form id="bypay-chat-form">
		<input id="bypay-chat-input" type="text" autocomplete="off" placeholder="Search products, prices, or order help..." aria-label="Ask Bypay Support">
		<button class="bypay-chat-send" type="submit" aria-label="Send message">
			<svg viewBox="0 0 24 24" width="19" height="19" fill="none" aria-hidden="true">
				<path d="M21 3 10.8 13.2M21 3l-6.5 18-3.7-7.8L3 9.5 21 3Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
	</form>
`;

document.body.append(launcher, chatWindow);

const messages = chatWindow.querySelector('#bypay-chat-messages');
const input = chatWindow.querySelector('#bypay-chat-input');
const quickActionButtons = chatWindow.querySelectorAll('.bypay-chat-quick');
const whatsappBar = chatWindow.querySelector('.bypay-chat-whatsapp');
let lastQuery = '';

function whatsappUrl(message) {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

whatsappBar.href = whatsappUrl('Hello Bypay Support, I need assistance.');

function scrollMessagesToBottom() {
    messages.scrollTop = messages.scrollHeight;
}

function addTextBubble(text, isUser = false) {
    const bubble = document.createElement('div');
    bubble.className = `bypay-chat-bubble${isUser ? ' bypay-chat-user' : ''}`;
    bubble.textContent = text;
    messages.append(bubble);
    scrollMessagesToBottom();
    return bubble;
}

function addWhatsAppButton(query) {
    const button = document.createElement('a');
    button.className = 'bypay-chat-link';
    button.textContent = 'Continue on WhatsApp (+234 810 572 4116)';
    button.href = whatsappUrl(`Hello Bypay Support, I need assistance with: ${query}`);
    button.target = '_blank';
    button.rel = 'noopener noreferrer';
    const bubble = addTextBubble('A support specialist can help you further.');
    bubble.append(document.createElement('br'), button);
}

function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'bypay-chat-product';

    const image = document.createElement('img');
    image.src = product.image || '';
    image.alt = product.name;

    const details = document.createElement('div');
    const name = document.createElement('p');
    name.className = 'bypay-chat-product-name';
    name.textContent = product.name;

    const price = document.createElement('p');
    price.className = 'bypay-chat-product-price';
    price.textContent = `₦${(Number(product.priceCents) / 100).toFixed(2)}`;

    const stock = document.createElement('span');
    stock.className = `bypay-chat-stock${product.inStock === false ? ' sold-out' : ''}`;
    stock.textContent = product.inStock === false ? 'SOLD OUT' : 'IN STOCK';

    details.append(name, price, stock);
    card.append(image, details);
    return card;
}

function addProductResults(results, intro) {
    addTextBubble(intro);
    if (!results.length) {
        addTextBubble('I could not find a matching product in the current catalog.');
        addWhatsAppButton(lastQuery);
        return;
    }

    const container = document.createElement('div');
    container.className = 'bypay-chat-results';
    results.slice(0, 4).forEach((product) => container.append(createProductCard(product)));
    messages.append(container);
    scrollMessagesToBottom();
}

function searchProducts(query) {
    const terms = query.toLowerCase().match(/[a-z0-9]+/g) || [];
    const searchTerms = terms.filter((term) => !stopWords.has(term));
    if (!searchTerms.length) {
        return [];
    }

    return products
        .map((product) => {
            const fields = [product.name, product.category, ...(product.keywords || [])]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();
            const score = searchTerms.reduce((total, term) => total + (fields.includes(term) ? 1 : 0), 0);
            return { product, score };
        })
        .filter(({ score }) => score > 0)
        .sort((first, second) => second.score - first.score)
        .map(({ product }) => product);
}

function getValidCartItems() {
    return cart
        .map((item) => ({ item, product: getProduct(String(item.productId)) }))
        .filter(({ item, product }) => product && Number(item.quantity) > 0);
}

function addLink(parent, text, href) {
    const link = document.createElement('a');
    link.className = 'bypay-chat-link';
    link.textContent = text;
    link.href = href;
    parent.append(link);
}

function answerQuery(query, action = '') {
    lastQuery = query;
    if (query) {
        addTextBubble(query, true);
    }

    if (action === 'lowest') {
        const lowestPriced = products
            .filter((product) => product.inStock !== false)
            .sort((first, second) => Number(first.priceCents) - Number(second.priceCents))
            .slice(0, 4);
        addProductResults(lowestPriced, 'These are the four lowest-priced items currently in stock:');
        return;
    }

    if (action === 'status' || /\b(cart|order|orders|checkout)\b/i.test(query)) {
        const validItems = getValidCartItems();
        const itemCount = validItems.reduce((total, { item }) => total + Number(item.quantity), 0);
        const subtotal = validItems.reduce((total, { item, product }) => (
            total + Number(product.priceCents) * Number(item.quantity)
        ), 0);
        const bubble = addTextBubble(
            `Your cart has ${itemCount} item${itemCount === 1 ? '' : 's'} with a subtotal of ₦${(subtotal / 100).toFixed(2)}. You have ${orders.length} placed order${orders.length === 1 ? '' : 's'}.`
        );
        addLink(bubble, 'View checkout', 'checkout.html');
        addLink(bubble, 'View orders', 'orders.html');
        return;
    }

    if (action === 'policy' || /\b(payment|paystack|shipping|delivery|tracking|track)\b/i.test(query)) {
        addTextBubble('Bypay processes payments in Naira (₦) via Paystack. Shipping options are Free, Standard, and Express, with real-time package tracking available for placed orders.');
        return;
    }

    if (action === 'human') {
        addWhatsAppButton('I would like to speak with a support agent.');
        return;
    }

    if (action === 'availability') {
        addTextBubble('Enter a product name or category and I will check the current catalog and stock status.');
        return;
    }

    const results = searchProducts(query);
    if (results.length) {
        addProductResults(results, 'Here are the closest catalog matches:');
    } else {
        addTextBubble('I could not match that request to a product or support topic.');
        addWhatsAppButton(query || 'I need assistance.');
    }
}

function setChatOpen(isOpen) {
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    launcher.setAttribute('aria-expanded', String(isOpen));
    if (isOpen) {
        input.focus();
    }
}

launcher.addEventListener('click', () => setChatOpen(chatWindow.style.display !== 'flex'));
chatWindow.querySelector('.bypay-chat-close').addEventListener('click', () => setChatOpen(false));
chatWindow.querySelector('#bypay-chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const query = input.value.trim();
    if (!query) {
        return;
    }
    input.value = '';
    answerQuery(query);
});

quickActionButtons.forEach((button) => {
    button.addEventListener('click', () => {
        const action = button.dataset.action;
        answerQuery(button.textContent, action);
    });
});

loadFirestoreProducts().catch(() => { });
