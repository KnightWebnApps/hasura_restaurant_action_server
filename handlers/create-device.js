const bcrypt = require("bcryptjs")
const { createNewDevice } = require('../utils')


module.exports = createStripePaymentIntent = async (req, res) => {
  const { email, password } = req.body.input;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    
    const deviceId = await createNewDevice(email, hashedPassword);
  
    return res.send({
      deviceId
    });
  } catch (error) {
    return res.status(500).send({message: error})
  }

}