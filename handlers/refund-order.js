const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const { graphql } = require("../utils");
const {
  UPDATE_ORDER_WITH_REFUND,
} = require("../helpers/graphqlOperations");

module.exports = refundOrder = async (req, res) => {
  const { orderId, intentId, reason } = req.body.input;

  try {
    
    const refund = await stripe.refunds.create({
      payment_intent: intentId,
      reason,
    });

    await graphql.request(UPDATE_ORDER_WITH_REFUND, { id: orderId, refundId: refund.id })
  
    res.send({ amount: refund.amount })
  } catch (error) {
    console.error(error)
    res.status(400).send({ message: error.message})
  }

}