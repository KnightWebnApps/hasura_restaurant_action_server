const { calculateOrderAmount, createOrder, adjustRewardPoints } = require('../utils');

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

module.exports = createStripePaymentIntent = async (req, res) => {
  const { items, order_type } = req.body.input;

  const user_id = req.body.session_variables["x-hasura-user-id"];
  // const role = req.body.session_variables["x-hasura-role"];

  // Create a PaymentIntent with the order amount and currency
  const { total, subtotal } = await calculateOrderAmount(items);
  let intent
  try {
    
    intent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      confirm: true
    });

  } catch (error) {
    console.log(error)
    res.status(500).send({message: "Failed to create payment"})
  }

  const order = await createOrder(
    items,
    user_id,
    order_type,
    intent,
    subtotal,
    total,
  );
  console.log(order)

  await adjustRewardPoints(order.subtotal, user_id)

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