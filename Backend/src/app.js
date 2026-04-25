const express = require('express');
const { error } = require('./utils/response');
const errorMiddleware = require('./middlewares/errorMiddleware');
const morgan = require("morgan");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
app.use(helmet());
app.use(errorMiddleware);

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Server is running',
        timestamp: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.send('Welcome to the Billing App Backend!');
});

app.get('/error', (req, res) => {
    return error(res, "Something Failed", 500);
})

module.exports = app;