const express = require("express");
const app = express();

require("dotenv").config();

// * Handler Imports
const createStripePaymentIntent = require('./handlers/create-payment-intent');
const createDevice = require('./handlers/create-device');
const getPayment = require("./handlers/get-payment");

app.use(express.static("."));

app.use(express.json());

// * Handlers
app.post("/create-payment-intent", createStripePaymentIntent);
app.post("/create-device", createDevice);
app.post("/get-payment", getPayment);

// * Listen
app.listen({ port: process.env.PORT || 4000 }, () => console.log(`🚀 Server ready at ${process.env.PORT}`) );
