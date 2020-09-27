const { graphql } = require("../utils");
const {
  REWARD_POINTS,
  GET_REWARDS_BY_PK,
  UPDATE_POINTS,
  CREATE_REWARD_REDEMPT,
  GET_PRODUCT,
} = require("./graphqlOperations");


const validateReward = async (rewardId, user_id) => {
  const pointsQuery = await graphql.request(REWARD_POINTS, { id: user_id });

  const rewardQuery = await graphql.request(GET_REWARDS_BY_PK, {
    id: rewardId,
  });

  if (pointsQuery.errors !== undefined || rewardQuery.errors !== undefined) {
    console.error(pointsQuery.errors, rewardQuery.errors);
    throw new Error("Failed to get rewards");
  }

  const reward = rewardQuery.reward_by_pk;
  const user = pointsQuery.user_by_pk;

  if (user.reward_points < reward.point_cost) {
    throw new Error("Not Enough Points");
  }

  return reward;
};

const completeRewardRedemption = async (rewardId, user_id) => {
  try {
    const pointsQuery = await graphql.request(REWARD_POINTS, { id: user_id });

    const rewardQuery = await graphql.request(GET_REWARDS_BY_PK, {
      id: rewardId,
    });

    if (pointsQuery.errors !== undefined || rewardQuery.errors !== undefined) {
      console.error(pointsQuery.errors, rewardQuery.errors);
      throw new Error("Failed to get rewards");
    }

    const reward = rewardQuery.reward_by_pk;
    const user = pointsQuery.user_by_pk;

    const points = user.reward_points - reward.point_cost;

    return await graphql.request(UPDATE_POINTS, { id: user_id, points });
  } catch (error) {
    console.error(error);
    throw new Error("Failed to complete reward redemption");
  }
};

const addRewardPoints = async (user_id) => {
  const pointsQuery = await graphql.request(REWARD_POINTS, { id: user_id });

  if (pointsQuery.errors !== undefined) {
    console.log(pointsQuery.errors);
    throw new Error("Failed To get user points");
  }

  const oldPoints = pointsQuery.user_by_pk.reward_points;

  const points = oldPoints + 10;

  return await graphql.request(UPDATE_POINTS, { id: user_id, points });
};

const calculateRewardDiscount = async (items, reward, subtotal, user_id) => {
  const item = await graphql.request(GET_PRODUCT, { id: reward.item_id });
  if (item.errors !== undefined) {
    console.log(item.errors);
    throw new Error("Item not Found");
  }

  let discountAmount = 0;
  switch (reward.reward_type) {
    case "FREE_ITEM":
      const containsOrderItem = items.some(
        (i) => i.item_reference_id === item.Product._id
      );

      if (containsOrderItem === false) {
        throw new Error("Reward not in order");
      }

      discountAmount = item.Product.price;
      break;
    case "BOGO":
      const orderItems = items.filter(
        (i) => i.item_reference_id === item.Product._id
      );

      if (orderItems.length === 1) {
        if (orderItems[0].quantity <= 1) {
          throw new Error("No additional items for bogo");
        } else {
          return item.Product.price;
        }
      }

      orderItems.sort((a, b) => a.price - b.price);

      let price = item.Product.price;

      if (orderItems[0].options !== null) {
        orderItems[0].options.forEach((opt) => {
          if (opt.value !== undefined || opt.value !== null) {
            price += opt.value.price;
          } else {
            opt.choices.forEach((ch) =>
              ch.isSelected === true ? (price += ch.price) : null
            );
          }
        });
      }

      discountAmount = price;
      break;
    case "PERCENT_OFF":
      const discount = (reward.percent_off / 100) * subtotal;

      discountAmount = discount;
      break;
    case "PRICE_OFF":
      discountAmount = reward.price_off;
      break;
    default:
      throw new Error("Type not supported");
  }

  const redemption = await graphql.request(CREATE_REWARD_REDEMPT, {
    discountAmount,
    rewardId: reward.id,
    user_id,
  });
  return {
    discountAmount,
    rewardRedemptionId: redemption.insert_reward_redemption_one.id,
  };
};

module.exports = {
  addRewardPoints,
  calculateRewardDiscount,
  validateReward,
  completeRewardRedemption,
};
