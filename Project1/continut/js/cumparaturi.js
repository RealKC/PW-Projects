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

function addProduct() {
    const name = document.getElementById('productName').value;
    const quantity = Number.parseInt(document.getElementById('quantity').value);

    const rawProducts = localStorage.getItem(PRODUCTS_KEY);
    const products = rawProducts != null ? JSON.parse(rawProducts) : [];
    const product = new Product(getNewProductId(products), name, quantity);
    products.push(product);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

/**
 * Returns an ID suitable for a new product
 * @param {Product[]} products
 * @returns {number} - the ID
 */
function getNewProductId(products) {
    products.sort((a, b) => a.id - b.id);

    return products[products.length - 1].id;
}
