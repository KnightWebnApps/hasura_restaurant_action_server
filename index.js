const express = require("express");
const app = express();

require("dotenv").config();

// * Handler Imports
const createStripePaymentIntent = require("./handlers/create-payment-intent");
const createDevice = require("./handlers/create-device");
const getPayment = require("./handlers/get-payment");
const createFeedback = require("./handlers/create-feedback");
const createCheckout = require("./handlers/start-checkout");
const completeCheckout = require("./handlers/finish-checkout");
const cancelOrder = require("./handlers/cancel-order");
const refundOrder = require("./handlers/refund-order");
const refundOrderAmount = require('./handlers/refund-order-amount');

app.use(express.static("."));

app.use(express.json());

// * Handlers
app.post("/create-payment-intent", createStripePaymentIntent);
app.post("/create-device", createDevice);
app.post("/get-payment", getPayment);
app.post("/create-feedback", createFeedback);
app.post("/create-checkout", createCheckout);
app.post("/complete-checkout", completeCheckout);
app.post("/cancel-order", cancelOrder);
app.post("/refund-order", refundOrder);
app.post("/refund-order-amount", refundOrderAmount);

// * Listen
app.listen({ port: process.env.PORT || 4000 }, () =>
  console.log(`🚀 Server ready at ${process.env.PORT}`)
);
