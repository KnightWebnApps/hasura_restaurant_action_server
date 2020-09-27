const { graphql } = require('../utils')
const { CREATE_ORDER, UPDATE_ORDER, GET_PRODUCTS } = require('./graphqlOperations')

const createOrder = async (items, user_id, type, intent, subtotal, total, rewardId) => {
  try {

    const orderQuery = await graphql.request(CREATE_ORDER, {
      user_id,
      type,
      payment: intent,
      intent: intent.id,
      total,
      items,
      subtotal,
      rewardId
    });

    if (orderQuery.errors !== undefined) {
      console.log(orderQuery.errors);
      throw new Error("Failed to create order");
    }

    return { ...orderQuery.insert_order_one };

  } catch (error) {
    console.error(error);
    throw new Error("Failed to create order");
  }

};

const updateOrder = async (payment, id) => {
  try {

    const request = await graphql.request(UPDATE_ORDER, {
      id,
      payment
    })

    if (request.errors !== undefined) {
      console.error(request.errors)
      throw new Error('Request Failed')
    }


    return { ...request.update_order_by_pk }
  } catch (error) {
    console.error(error)
    throw new Error('Failed to Update Order')
  }
}

const calculateOrderAmount = async (items) => {
  const ids = [];
  items.forEach((i) => ids.push(i.item_reference_id));

  // 1. Get all cart products
  const query = await graphql.request(GET_PRODUCTS, { items: ids });

  if (query.errors !== undefined) {
    console.log(query.errors);
    throw new Error("Failed to get references");
  }

  // 2. Validate Products
  if (query.allProduct.length === 0) {
    throw new Error("No Products");
  }

  let subtotal = 0;

  query.allProduct.forEach((p) => {
    const eqItems = items.filter((i) => i.item_reference_id === p._id);

    if (eqItems === null || eqItems.length === 0) {
      throw new Error("Invalid Item reference");
    }

    //! TODO compare each item to the equivalent product and be sure the option exists

    //* Could be same item with different options ** handle multiple items
    if (eqItems.length > 1) {
      eqItems.forEach((i) => {
        if (i.options !== null) {
          i.options.forEach((opt) => {
            if (opt.value !== undefined || opt.value !== null) {
              p.price += opt.value.price;
            } else {
              opt.choices.forEach((ch) =>
                ch.isSelected === true ? (p.price += ch.price) : null
              );
            }
          });
        }

        subtotal += p.price * i.quantity;
      });
    } else {
      if (eqItems[0].options !== null) {
        eqItems[0].options.forEach((opt) => {
          if (opt.value === undefined) {
            opt.choices.forEach((ch) =>
              ch.isSelected === true ? (p.price += ch.price) : null
            );
          } else {
            p.price += opt.value.price;
          }
        });
      }
      subtotal += p.price * eqItems[0].quantity;
    }
  });

  // 3. Sum items and add tax
  const tax = subtotal * query.allSettings[0].taxRate;
  const total = subtotal + tax;

  return { total, subtotal };
};

module.exports = { createOrder, calculateOrderAmount, updateOrder }