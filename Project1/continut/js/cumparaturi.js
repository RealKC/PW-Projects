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



let backend = 'localStorage';
const LOCAL_STORAGE = 'localStorage';
const INDEXED_DB = 'IndexedDB';


class StorageBackend {
    /**
     * @returns {StorageBackend}
     */
    static get instance() {
        switch (backend) {
            case LOCAL_STORAGE:
                return localStorageBackend;
            case INDEXED_DB:
                return indexedDBBackend;
            default:
                throw new Error(`Invalid backend: ${backend}`);
        }
    }

    /**
     * Stores a product in storage
     *
     * @param {Product} item
     */
    addProduct(item) {
        throw Error('Unimplemented `storeItem`');
    }

    /**
     * Gets all products from storage
     *
     * @returns {Promise<Product[]>}
     */
    getAllProducts() {
        throw Error('Unimplemented `getItem`')
    }
}

class LocalStorageBackend extends StorageBackend {
    addProduct(item) {
        const products = this.getAllProducts();
        products.append(item);
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    }

    getAllProducts() {
        const rawProducts = localStorage.getItem(PRODUCTS_KEY);
        const products = rawProducts != null ? JSON.parse(rawProducts) : [];

        return new Promise((resolve, _reject) => {
            resolve(products);
        });
    }
}

class IndexedDBBackend extends StorageBackend {
    constructor() {
        super();

        this.db = null;

        const request = window.indexedDB.open('ProductsStorage');
        request.onsuccess = (event) => {
            const db = event.target.result;
            this.db = db;
            console.log('success');
        };
        request.onerror = (event) => {
            console.error(`Failed to open IndexDB: ${event.target.errorCode}`);
        };
        request.onupgradeneeded = (event) => {
            this.db = event.target.result;
            this.db.createObjectStore('products', { keyPath: 'id', autoIncrement: true });
        };
    }

    addProduct(item) {
        const transaction = this.db.transaction(['products'], 'readwrite');
        transaction.objectStore('products').put(item);
    }

    getAllProducts() {
        return new Promise((resolve, _reject) => {
            if (!this.db) {
                resolve([]);
                return;
            }

            const getAllTransaction = this
                .db
                .transaction(['products'], 'readonly')
                .objectStore('products')
                .getAll();

            getAllTransaction.onsuccess = (event) => resolve(event.target.result)
        });
    }
}

const localStorageBackend = new LocalStorageBackend();
const indexedDBBackend = new IndexedDBBackend();

function main() {
    // If the user navigates away and returns, we want to keep showing them their cart
    populateTableWithInitialData();
    worker.onmessage = (event) => {
        const emptyCart = document.querySelector(`#${SHOPPING_CART_HOST}>p`);
        const products = StorageBackend.instance.getAllProducts();
        if (emptyCart) {
            emptyCart.remove();
            createShoppingCartTable(products);
        } else {
            /** @type {HTMLTableElement} */
            let table = document.querySelector(`#${SHOPPING_CART_HOST}>table`);
            if (table === null) {
                table = document.createElement('table');
                document.querySelector(`#${SHOPPING_CART_HOST}`).appendChild(table);
            }
            const row = table.insertRow(products.length);
            row.insertCell(0).textContent = event.data.id.toString();
            row.insertCell(1).textContent = event.data.name;
            row.insertCell(2).textContent = event.data.quantity.toString();
        }
    };
    document.getElementById('storageBackendSelector').oninput = (event) => {
        if (backend !== event.target.value) {
            document.querySelector(`#${SHOPPING_CART_HOST}>table`)?.remove();
            backend = event.target.value;
            createShoppingCartTable(StorageBackend.instance.getAllProducts());
        }
    };
}

function populateTableWithInitialData() {
    const products = StorageBackend.instance.getAllProducts();

    if (products.length === 0) {
        const yourCartIsEmpty = document.createElement('p');
        yourCartIsEmpty.textContent = 'Your cart is empty';
        document.getElementById(SHOPPING_CART_HOST).appendChild(yourCartIsEmpty);
    } else {
        createShoppingCartTable(StorageBackend.instance.getAllProducts());
    }
}

/**
 * Creates the shopping cart table as a child of the {@link SHOPPING_CART_HOST} div
 *
 * @param {Product[]} products
 */
async function createShoppingCartTable(products) {
    const table = document.createElement('table');
    const header = table.insertRow(0);
    header.insertCell(0).textContent = 'Nr.';
    header.insertCell(1).textContent = 'Nume produs';
    header.insertCell(2).textContent = 'Cantitate';

    let idx = 1;
    for (const product of await StorageBackend.instance.getAllProducts()) {
        const productRow = table.insertRow(idx);
        productRow.insertCell(0).textContent = product.id.toString();
        productRow.insertCell(1).textContent = product.name;
        productRow.insertCell(2).textContent = product.quantity.toString();
        idx++;
    }
    document.getElementById(SHOPPING_CART_HOST).appendChild(table);
}

async function addProduct() {
    const name = document.getElementById('productName').value;
    const quantity = Number.parseInt(document.getElementById('quantity').value);

    const product = new Product(getNewProductId(await StorageBackend.instance.getAllProducts()), name, quantity);
    StorageBackend.instance.addProduct(product);
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
