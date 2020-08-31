const express = require("express");
const app = express();

require("dotenv").config();

// * Handler Imports
const createStripePaymentIntent = require('./handlers/create-payment-intent');

app.use(express.static("."));

app.use(express.json());

// * Handlers
app.post("/create-payment-intent", createStripePaymentIntent);


// * Listen
app.listen(4242, () => console.log('Node server listening on port 4242!'));
