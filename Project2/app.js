'use strict';

const express = require('express')
const expressLayouts = require('express-ejs-layouts')
const bodyParser = require('body-parser')
const fs = require('fs')
const path = require('path')

const app = express();

const port = 6789;

app.set('view engine', 'ejs');
app.use(expressLayouts);
app.use('/public', express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.set('layout extractStyles', true);

app.get('/', (req, res) => res.send('Hello world'));

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
