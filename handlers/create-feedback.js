const { createFeedback } = require('../utils')

module.exports = createDevice = async (req, res) => {
  const { comment, rating, orderId } = req.body.input;

  try {
    const feedbackId = await createFeedback(comment, rating, orderId)

    return res.send({
      id: feedbackId
    })
  } catch (error) {
    return res.status(500).send({
      message: error
    })
  }
}