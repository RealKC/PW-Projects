'use strict';

const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
const fs = require('fs');
const cookieParser = require('cookie-parser');

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
        title: 'MițFood'
    };

    res.render('index', {
        username: req.cookies.username,
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

    if (req.body.username === 'user' && req.body.password === '1234') {
        res.cookie('username', req.body.username);
        res.redirect('/');
    } else {
        res.cookie('errorMessage', 'Credențiale greșite');
        res.redirect('/auth');
    }
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
