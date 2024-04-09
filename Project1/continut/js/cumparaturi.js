class Product {
    /**
     * @param {string} name - The name of the product
     * @param {number} quantity - The number of products the user is buying
     */
    constructor(name, quantity) {
        this.name = name;
        this.quantity = quantity;
    }
}

function addProduct() {
    let name = document.getElementById('productName').value;
    let quantity = Number.parseInt(document.getElementById('quantity').vlaue);

    const product = new Product(name, quantity);

    console.log(`${product.name} ${product.quantity}`)
}
