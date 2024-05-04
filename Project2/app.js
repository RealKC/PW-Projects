'use strict';

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();

/** @type {import('sqlite3').Database | undefined} */
let database = undefined;

/**
 * A function to be used for tagged template literals that makes the [Inline SQL](https://marketplace.visualstudio.com/items?itemName=qufiwefefwoyn.inline-sql-syntax)
 * VS Code extension highlight template strings as SQL
 */
const sql = (strings, ...values) => String.raw({ raw: strings }, ...values);

const app = express();

const port = 6789;

app.set('view engine', 'ejs');
app.use(expressLayouts);
app.use('/public', express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('layout extractStyles', true);

app.get('/', async (req, res) => {
    res.locals = {
        title: 'MițFood',
        user: req.cookies.user,
    };

    const products = new Promise((resolve, reject) => {
        if (!database) {
            console.log('Database wasn\'t initialized yet, returning empty list...');
            resolve([]);
            return;
        }

        database.all(sql`SELECT * FROM products;`, [], (err, rows) => {
            if (err) {
                console.error(`Got sqlite error while querying for all products: ${err}`);
                resolve([]);
                return;
            }
            resolve(rows);
        })
    });

    res.render('index', {
        products: await products,
    });
});

app.get('/auth', (req, res) => {
    res.locals = {
        title: "Autentificare"
    };
    res.render('auth', {
        errorMessage: req.cookies.errorMessage,
    });
});

app.post('/verify-auth', (req, res) => {
    console.log(`verify-auth ${req.body} ${req.body.username} ${req.body.password}`);

    fs.readFile('utilizatori.json', (err, data) => {
        if (err) {
            throw err;
        }

        const users = JSON.parse(data);

        res.clearCookie('errorMessage')

        for (const user of users) {
            if (req.body.username === user.username && req.body.password === user.password) {
                delete user['password'];
                res.cookie('user', user);
                res.redirect('/');
                return;
            }
        }

        res.cookie('errorMessage', 'Credențiale greșite');
        res.redirect('/auth');
    });
});

app.post('/logout', (req, res) => {
    res.clearCookie('user');
    res.redirect('/');
});

app.post('/create-db', (req, res) => {
    database = new sqlite3.Database('./db.sqlite');
    database.run(sql`
CREATE TABLE IF NOT EXISTS products(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    price REAL
);
    `, (err) => {
        if (err) {
            console.error(`Got sqlite error: ${err}`);
        }
        res.redirect('/');
    });
});

app.post('/load-db', (req, res) => {
    if (!database) {
        console.error('POST to /load-db before database was initialized');
        res.redirect('/');
        return;
    }

    database.run(sql`
INSERT INTO products(name, price) VALUES
    ('Mozarella 1kg', 20.5),
    ('Piept de pui 1kg', 10),
    ('Cartofi 1kg', 4),
    ('Tabletă ciocolată Milka', 3.7),
    ('Ciocolata Rom Buzz', 2.14);
    `, (err) => {
        if (err) {
            console.error(`Got sqlite error: ${err}`);
        }
        res.redirect('/');
    });
});

app.post('/add-to-cart', (req, res) => {
    const id = req.body.id;
    const user = req.cookies.user;

    if (!user.cart) {
        user.cart = [];
    }

    user.cart.push(id);
    res.cookie('user', user);
    res.redirect('/');
});

app.get('/view-cart', async (req, res) => {
    const cart = new Promise((resolve, reject) => {
        const cart = [...new Set(req.cookies.user.cart)];
        if (cart.length > 0 && database) {
            database.all(
                sql`SELECT * FROM products WHERE id in (${cart.map(() => '?').join(', ')})`,
                cart,
                (err, rows) => {
                    if (err) {
                        console.error(`Got SQL error trying to get cart: ${err}`);
                        resolve([]);
                        return;
                    }

                    const items = req.cookies.user.cart;
                    for (const row of rows) {
                        row.count = 0;
                        for (const item of items) {
                            if (row.id == item) {
                                row.count++;
                            }
                        }
                    }
                    resolve(rows);
                }
            )
        } else {
            resolve([]);
        }
    });

    res.locals = {
        title: 'Coșul meu',
    };
    res.render('view-cart', {
        cart: await cart,
    });
});

app.get('/chestionar', (req, res) => {
    res.locals = {
        title: 'Chestionar'
    };

    fs.readFile('questions.json', (err, data) => {
        if (err) {
            throw err;
        }

        const questions = JSON.parse(data);
        res.render('questionnaire', { questions });
    })
});

app.post('/rezultat-chestionar', (req, res) => {
    fs.readFile('questions.json', (err, data) => {
        if (err) {
            throw err;
        }

        const questions = JSON.parse(data);
        const answers = req.body;
        let correctAmount = 0;
        for (const question of questions) {
            const answer = answers[question.id];
            if (answer.toString() === question.answer.toString()) {
                correctAmount++;
            }
        }

        res.render('questionnaire-result', { correctAmount, totalAmount: questions.length })
    })
});

app.listen(port, () => console.log(`The server is running at http://localhost:${port}`));
