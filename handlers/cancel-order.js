const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const { graphql } = require("../utils");
const {
  GET_ORDER_BY_PK,
  CANCEL_ORDER
} = require("../helpers/graphqlOperations");

module.exports = cancelStripePaymentIntent = async (req, res) => {
  const { orderId } = req.body.input;

  try {
    const query = await graphql.request(GET_ORDER_BY_PK, { id: orderId });
  
    if (query.errors !== undefined) {
      console.log(query.errors);
      throw new Error("Failed to get order");
    } 
  
    let intent = null
    try {
      intent = await stripe.paymentIntents.cancel(query.order_by_pk.intent_id);
    } catch (error) {
      console.error(error)
      throw new Error('Failed to Create Payment Intent')
    }
  
    const mutation = await graphql.request(CANCEL_ORDER, { payment: intent, id: orderId });
  
    if (mutation.errors !== undefined) {
      console.log(mutation.errors);
      throw new Error("Failed to update order");
    }
  
    res.send({
      id: mutation.update_order_by_pk.id,
      state_enum: mutation.update_order_by_pk.state_enum,
    });
    
  } catch (error) {
    
    console.error(error)
    res.send({ message: "Cancel Failed" })
  }
}