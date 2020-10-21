const { createFeedback } = require('../helpers/feedbackHelpers')

module.exports = createFeedback = async (req, res) => {
  const { comment, rating, orderId } = req.body.input;

  try {
    const feedbackId = await createFeedback(comment, rating, orderId)

    return res.send({
      id: feedbackId
    })
  } catch (error) {
    return res.status(400).send({
      message: error
    })
  }
}