class Product {
    /**
     * @param {number} id - The ID of the product
     * @param {string} name - The name of the product
     * @param {number} quantity - The number of products the user is buying
     */
    constructor(id, name, quantity) {
        this.id = id;
        this.name = name;
        this.quantity = quantity;
    }
}

const PRODUCTS_KEY = 'products';
const SHOPPING_CART_HOST = 'shopping-cart-host';
const worker = new Worker('js/cumparaturi-worker.js');

function main() {
    // If the user navigates away and returns, we want to keep showing them their cart
    populateTableWithInitialData();
    worker.onmessage = (event) => {
        const emptyCart = document.querySelector(`#${SHOPPING_CART_HOST}>p`);
        const products = getProducts();
        if (emptyCart) {
            emptyCart.remove();
            createShoppingCartTable(products);
        } else {
            /** @type {HTMLTableElement} */
            const table = document.querySelector(`#${SHOPPING_CART_HOST}>table`);
            const row = table.insertRow(products.length);
            row.insertCell(0).textContent = event.data.id.toString();
            row.insertCell(1).textContent = event.data.name;
            row.insertCell(2).textContent = event.data.quantity.toString();
        }
    };
}

function populateTableWithInitialData() {
    const products = getProducts();

    if (products.length === 0) {
        const yourCartIsEmpty = document.createElement('p');
        yourCartIsEmpty.textContent = 'Your cart is empty';
        document.getElementById(SHOPPING_CART_HOST).appendChild(yourCartIsEmpty);
    } else {
        createShoppingCartTable(getProducts());
    }
}

/**
 * Creates the shopping cart table as a child of the {@link SHOPPING_CART_HOST} div
 *
 * @param {Product[]} products
 */
function createShoppingCartTable(products) {
    const table = document.createElement('table');
    const header = table.insertRow(0);
    header.insertCell(0).textContent = 'Nr.';
    header.insertCell(1).textContent = 'Nume produs';
    header.insertCell(2).textContent = 'Cantitate';

    let idx = 1;
    for (const product of products) {
        const productRow = table.insertRow(idx);
        productRow.insertCell(0).textContent = product.id.toString();
        productRow.insertCell(1).textContent = product.name;
        productRow.insertCell(2).textContent = product.quantity.toString();
        idx++;
    }
    document.getElementById(SHOPPING_CART_HOST).appendChild(table);
}

/**
 * Retrieves products from localStorage
 * @returns {Product[]}
 */
function getProducts() {
    const rawProducts = localStorage.getItem(PRODUCTS_KEY);
    const products = rawProducts != null ? JSON.parse(rawProducts) : [];

    return products;
}

function addProduct() {
    const name = document.getElementById('productName').value;
    const quantity = Number.parseInt(document.getElementById('quantity').value);

    const products = getProducts();
    const product = new Product(getNewProductId(products), name, quantity);
    products.push(product);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    worker.postMessage(product);
}

/**
 * Returns an ID suitable for a new product
 * @param {Product[]} products
 * @returns {number} - the ID
 */
function getNewProductId(products) {
    products.sort((a, b) => a.id - b.id);

    if (products.length === 0) {
        return 1;
    }

    return products[products.length - 1].id + 1;
}
