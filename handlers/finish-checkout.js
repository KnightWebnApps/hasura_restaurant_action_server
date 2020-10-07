const { updateOrder } = require('../helpers/orderHelpers');
const { completeRewardRedemption, addRewardPoints } = require('../helpers/rewardHelpers')

module.exports = completeCheckout = async (req, res) => {
  const { payment, orderId } = req.body.input;

  const user_id = req.body.session_variables["x-hasura-user-id"];

  try {
    
    const { id, state_enum, reward_redemption } = await updateOrder(payment, orderId)

    if(reward_redemption !== null){
      await completeRewardRedemption(reward_redemption.reward_id, user_id)
    }else{
      await addRewardPoints(user_id)
    }

    res.status(200).send({
      id,
      state_enum
    })

  } catch (error) {
    res.status(400).send({
      message: error
    })
  }
}