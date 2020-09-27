const { updateOrder } = require('../helpers/orderHelpers');
const { completeRewardRedemption, addRewardPoints } = require('../helpers/rewardHelpers')

module.exports = startCheckout = async (req, res) => {
  const { payment, orderId } = req.body.input;

  const user_id = req.body.session_variables["x-hasura-user-id"];

  try {
    
    const { id, is_completed, reward_redemption } = await updateOrder(payment, orderId)

    if(reward_redemption !== null){
      await completeRewardRedemption(reward_redemption.reward_id, user_id)
    }else{
      await addRewardPoints(user_id)
    }

    res.status(200).send({
      id,
      is_completed
    })

  } catch (error) {
    res.status(400).send({
      message: error
    })
  }
}