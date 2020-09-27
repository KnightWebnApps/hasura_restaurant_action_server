const { GraphQLClient } = require("graphql-request");
const moment = require("moment");


require("dotenv").config();

const graphql = new GraphQLClient(process.env.ENDPOINT, {
  headers: {
    "content-type": "application/json",
    "X-Hasura-Admin-Secret": process.env.HASURA_ADMIN_SECRET,
  },
});

const createNewDevice = async (email, password) => {
  try {
    const device = await graphql
      .request(DEVICESIGNUP, { email, password })
      .then((data) => {
        return data.insert_device.returning[0];
      });

    return device.id;
  } catch (error) {
    console.log(error);
    throw new Error("Failed to create device");
  }
};

module.exports = { graphql, createNewDevice }