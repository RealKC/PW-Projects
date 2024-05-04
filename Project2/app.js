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

app.get('/', (req, res) => {
    res.locals = {
        title: 'MițFood',
        user: req.cookies.user,
    };

    res.render('index', {

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
