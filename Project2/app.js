'use strict';

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const sqlite3 = require('sqlite3').verbose();
const uuid = require('uuid');

/** @type {import('sqlite3').Database | undefined} */
let database = undefined;

/**
 * A map from an auth token to a role
 *
 * This map exists so that the source of truth for roles is on the server, and so that
 * adversarial users cannot forge data that would make the server think a non-admin user
 * is an admin.
 */
const tokens = {};

/**
 * Map from ip address to number of logins
 *
 * @type {Map<string, number>}
 */
const failedLoginsByIP = new Map();

/**
 * Map from username to number of logins
 *
 * @type {Map<string, number>}
 */
const failedLoginsByName = new Map();

/**
 * This map stores how many times an IP has triggered a 404, and how many times it was trying to access a
 * suspicious path
 *
 * @type {Map<string, {count: number, suspiciousPathsCount: number, readonly isBanned: boolean}>}
 */
const notFoundByIP = new Map();

/**
 * How many 404s an IP must trigger before it is banned
 *
 * @type {number}
 */
const COUNT_SUSPICION_THRESHOLD = 10;

/**
 * How many 404s accessing suspicious paths an IP must trigger before it is banned
 *
 * @type {number}
 */
const SUSPICIOUS_PATH_COUNT_SUSPICION_THRESHOLD = 10;

/**
 * Register a 404 for a given IP
 *
 * @param {string} ip
 * @param {string} path
 * @return {boolean} true if the user got banned as a result of this 404
 */
function register404(ip, path) {
    let obj = notFoundByIP.get(ip) ?? {
        count: 0,
        suspiciousPathsCount: 0,
        get isBanned() {
            return this.count >= COUNT_SUSPICION_THRESHOLD || this.suspiciousPathsCount >= SUSPICIOUS_PATH_COUNT_SUSPICION_THRESHOLD;
        }
    };
    obj.count += 1;

    /**
     * @callback PathMatcher
     * @param {string} path
     * @return {boolean}
     *
     * @type {PathMatcher[]}
     */
    const SUSPICIOUS_PATH_MATCHERS = [
        (path) => path === 'wp-login.php',
        (path) => path.startsWith('/wp-admin/')
    ];

    for (const matcher of SUSPICIOUS_PATH_MATCHERS) {
        if (matcher(path)) {
            obj.suspiciousPathsCount += 1;
        }
    }

    notFoundByIP.set(ip, obj);

    setTimeout(() => {
        obj.count -= 1;
        obj.suspiciousPathsCount -= 1;
    }, 30_000);

    return obj.isBanned;
}

/**
 * Checks if an IP or username is currently banned
 *
 * @param {{username?: string, ip?: string}} param
 * @return {boolean}
 */
function isBanned(param) {
    if (param.username) {
        if ((failedLoginsByName.get(param.username) ?? 0) >= 10) {
            return true;
        }
    }

    if (param.ip) {
        if ((failedLoginsByIP.get(param.ip) ?? 0) >= 10) {
            return true;
        }

        const obj = notFoundByIP.get(param.ip);
        if (obj && obj.isBanned) {
            return true;
        }
    }

    return false;
}

function ipBannedMiddleware(req, res, next) {
    if (isBanned({ ip: req.ip })) {
        res.status(401).send('Interzis');
        return;
    }
    next();
}

/**
 * A function to be used for tagged template literals that makes the [Inline SQL](https://marketplace.visualstudio.com/items?itemName=qufiwefefwoyn.inline-sql-syntax)
 * VS Code extension highlight template strings as SQL
 */
const sql = (strings, ...values) => String.raw({ raw: strings }, ...values);

const app = express();

const port = 6789;

app.set('view engine', 'ejs');
app.set('trust proxy', false);
app.use(ipBannedMiddleware);
app.use(expressLayouts);
app.use('/public', express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('layout extractStyles', true);
app.use(favicon('public/favicon.ico'));

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

        // Not vulnerable to SQL injection as it doesn't use user input
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

/**
 * How much the server will wait after a failed login before decrementing its counter, in milliseconds.
 *
 * @type {number}
 */
const FAILED_LOGIN_TIMEOUT = 30_000;

/**
 * Adds a failed login for the given IP
 *
 * @param {string} ip
 * @return {number} The number of failed logins so far
 */
function addFailedLoginByIP(ip) {
    const count = failedLoginsByIP.get(ip);
    if (!count) {
        failedLoginsByIP.set(ip, 1);
    } else {
        failedLoginsByIP.set(ip, count + 1);
    }

    setTimeout(() => {
        const count = failedLoginsByIP.get(ip);
        if (count) {
            if (count == 1) {
                failedLoginsByIP.delete(ip);
            } else {
                failedLoginsByIP.set(ip, count - 1);
            }
        }
    }, FAILED_LOGIN_TIMEOUT);

    return (count ?? 0) + 1;
}

/**
 * Adds a failed login for the given username
 *
 * @param {string} username
 * @return {number} The number of failed logins so far
 */
function addFailedLoginByUsername(username) {
    const count = failedLoginsByName.get(username);
    if (!count) {
        failedLoginsByName.set(username, 1);
    } else {
        failedLoginsByName.set(username, count + 1);
    }

    setTimeout(() => {
        const count = failedLoginsByName.get(username);
        if (count) {
            if (count == 1) {
                failedLoginsByName.delete(username);
            } else {
                failedLoginsByName.set(username, count - 1);
            }
        }
    }, FAILED_LOGIN_TIMEOUT);

    return (count ?? 0) + 1;
}

app.post('/verify-auth', (req, res) => {
    fs.readFile('utilizatori.json', (err, data) => {
        if (err) {
            throw err;
        }

        const users = JSON.parse(data);

        res.clearCookie('errorMessage')

        if (isBanned({ ip: req.ip, username: req.body.username })) {
            res.cookie('errorMessage', 'Încearcă din nou mai târziu');
            res.status(401).redirect('/auth');
            return;
        }

        for (const user of users) {
            if (req.body.username === user.username && req.body.password === user.password) {
                delete user['password'];
                user.token = uuid.v4();
                tokens[user.token] = user.role;
                res.cookie('user', user);
                res.redirect('/');
                return;
            }
        }

        addFailedLoginByIP(req.ip);
        addFailedLoginByUsername(req.body.username);
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
    // Not vulnerable to SQL injection as it doesn't use user input
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

    // Not vulnerable to SQL injection as it doesn't use user input
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

app.get('/admin', (req, res, next) => {
    const role = tokens[req.cookies.user.token];
    if (!role || role !== 'admin') {
        next();
        return;
    }

    res.locals = {
        title: 'Admin dashboard'
    };
    res.render('admin');
});

app.post('/add-product', (req, res, next) => {
    const role = tokens[req.cookies.user.token];
    if (!role || role !== 'admin') {
        next();
        return;
    }

    const price = req.body.price ? Number.parseFloat(req.body.price) : undefined;
    if (!price || !Number.isFinite(price)) {
        console.log(`Tried adding product with price '${req.body.price}', which is invalid`);
        res.status(400).send('Invalid input');
        return;
    }

    const name = req.body.name;
    if (!name || name.length < 1) {
        console.log(`Tried adding product with name '${name}, which is invalid`);
        res.status(400).send('Invalid input');
        return;
    }

    if (database) {
        // Not vulnerable to SQL injection as it properly uses prepared statements
        database.run(sql`INSERT INTO products(name, price) VALUES (?, ?);`, [name, price], (err) => {
            if (err) {
                console.log(`Got error while inserting product(${name}, ${price}): ${err}`);
            }
        });
    }

    res.redirect('/admin');
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
        const user = req.cookies.user;

        if (!user) {
            resolve([]);
            return;
        }

        const cart = [...new Set(user.cart)];
        if (cart.length > 0 && database) {
            // Not vulnerable to SQL injection as the string concatenation is limited to strings I control
            // (even though it is based on user input, none of it goes in the final query string), and it
            // uses prepared statements
            database.all(
                sql`SELECT * FROM products WHERE id in (${cart.map(() => '?').join(', ')})`,
                cart,
                (err, rows) => {
                    if (err) {
                        console.error(`Got SQL error trying to get cart: ${err}`);
                        resolve([]);
                        return;
                    }

                    const items = user.cart;
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

        res.locals = { title: "Rezultat" };
        res.render('questionnaire-result', { correctAmount, totalAmount: questions.length })
    })
});

app.use((req, res, next) => {
    const isBanned = register404(req.ip, req.path);

    if (isBanned) {
        res.status(401).send('Forbidden');
    } else {
        res.locals = { title: 404 };
        res.status(404).render('404');
    }
});

app.listen(port, () => console.log(`The server is running at http://localhost:${port}`));
