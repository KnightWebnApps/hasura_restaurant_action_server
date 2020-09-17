const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

module.exports = getPayment = async (req, res) => {
  const { intent_id } = req.body.input;

  try{
    const paymentIntent = await stripe.paymentIntents.retrieve( intent_id );

    res.send({
      amount: paymentIntent.amount,
      amount_capturable: paymentIntent.amount_capturable,
      amount_received: paymentIntent.amount_received,
      cancellation_reason: paymentIntent.cancellation_reason,
      canceled_at: paymentIntent.canceled_at,
      client_secret: paymentIntent.client_secret,
      receipt_email: paymentIntent.receipt_email,
    });

  }catch(e){
    console.error(e)
    res.status(500).send({message: e})
  }

}