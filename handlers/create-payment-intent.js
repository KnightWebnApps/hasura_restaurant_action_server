const { calculateOrderAmount, createOrder } = require('../utils');

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

module.exports = createStripePaymentIntent = async (req, res) => {
  const { items, order_type } = req.body.input;

  const user_id = req.body.session_variables["x-hasura-user-id"];
  // const role = req.body.session_variables["x-hasura-role"];

  // Create a PaymentIntent with the order amount and currency
  const { total, subtotal } = await calculateOrderAmount(items);
  
  const intent = await stripe.paymentIntents.create({
    amount: total,
    currency: "usd",
  });

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
    clientSecret: intent.client_secret,
    id: order.id,
    total: order.total,
    subtotal: order.subtotal,
    order_num: order.order_num,
    order_type: order.type,
    intent_id: order.intent_id
  });
};