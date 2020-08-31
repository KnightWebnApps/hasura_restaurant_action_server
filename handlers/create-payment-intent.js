const { calculateOrderAmount, createOrder } = require('../utils');

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

module.exports = createStripePaymentIntent = async (req, res) => {
  const { items, type, is_paying_now } = req.body.input;

  const user_id = req.body.session_variables["x-hasura-user-id"];
  // Create a PaymentIntent with the order amount and currency
  const { total, subtotal } = calculateOrderAmount(items);

  let intent_id = null;

  if( is_paying_now ){
    intent_id = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
    });
  }

  console.log(intent_id)

  const order = await createOrder(items, type, total, subtotal, intent_id, user_id)
  console.log(order)

  res.send({
    clientSecret: paymentIntent.client_secret,
    id: order.id,
    total: order.total,
    subtotal: order.subtotal,
    order_num: order.order_num,
    type: order.type,
    intent_id: order.intent_id
  });
};