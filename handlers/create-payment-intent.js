const { calculateOrderAmount, createOrder } = require('../utils');

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

module.exports = createStripePaymentIntent = async (req, res) => {
  const { items, order_type, is_paying_now } = req.body.input;

  const user_id = req.body.session_variables["x-hasura-user-id"];
  // Create a PaymentIntent with the order amount and currency
  const { total, subtotal } = calculateOrderAmount(items);

  let intent = null;

  if( is_paying_now ){
    intent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
    });
  }

  console.log(intent)

  const order = await createOrder(
    items,
    user_id,
    order_type,
    intent,
    subtotal,
    total,
  );
  console.log(order)

  res.send({
    client_secret: intent?.client_secret,
    id: order.id,
    total: order.total,
    subtotal: order.subtotal,
    order_num: order.order_num,
    order_type: order.type,
    intent_id: order.intent_id
  });
};