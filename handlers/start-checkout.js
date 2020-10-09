const { calculateOrderAmount, createOrder } = require('../helpers/orderHelpers');
const { validateReward, calculateRewardDiscount } = require('../helpers/rewardHelpers')

const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

module.exports = startCheckout = async (req, res) => {
  const { items, orderType, rewardId } = req.body.input;

  const user_id = req.body.session_variables["x-hasura-user-id"];
  console.log(rewardId)
  if(rewardId === null){
    const { total, subtotal } = await calculateOrderAmount(items)
    const rewardRedemptionId = null;
    const intent = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
    });

    const order = await createOrder(items, user_id, orderType, intent, subtotal, total, rewardRedemptionId)

    res.status(200).send({
      id: order.id,
      subtotal: order.subtotal,
      total: order.total,
      clientSecret: intent.client_secret,
      intent_id: intent.id
    })

  }else{
    try {
      const { subtotal } = await calculateOrderAmount(items)
      const reward = await validateReward(rewardId, user_id)
      const { discountAmount, rewardRedemptionId } = await calculateRewardDiscount(items, reward, subtotal, user_id);

      let finalSubtotal = subtotal - discountAmount ;
      const finalTotal = finalSubtotal + (finalSubtotal * .08)

      const intent = await stripe.paymentIntents.create({
        amount: finalTotal,
        currency: 'usd'
      })

      const order = await createOrder(items, user_id, orderType, intent, finalSubtotal, finalTotal, rewardRedemptionId)

      res.status(200).send({
        id: order.id,
        subtotal: order.subtotal,
        total: order.total,
        clientSecret: intent.client_secret,
        intent_id: intent.id
      })
      
    } catch (error) {
      console.log(error)
      res.status(400).send({ message: "Failed to create checkout"})
    }
  }
}