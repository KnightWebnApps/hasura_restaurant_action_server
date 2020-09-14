const { GraphQLClient } = require("graphql-request");

require("dotenv").config();

const graphql = new GraphQLClient(process.env.ENDPOINT, {
  headers: {
    "X-Hasura-Admin-Secret": process.env.HASURA_ADMIN_SECRET,
  },
});


const GET_PRODUCTS = `
query($items: [ID!]){ 
  allProduct(where: { _id: {in: $items}}){
    _id
    price
    singleOptions{
      isRequired
      title
      value
      choices{
        name
        isSelected
        price
      }
    }
    multiOptions{
      title
      max
      choices{
        isSelected
        name
        price
      }
    }
  }
  allSettings{
    taxRate
    hours{
      day
      open
      close
    }
  }
}
`;

const CREATE_ORDER = `
mutation ($intent_id: String, $user_id: uuid, $total: Int, $type: order_type_enum, $items: [order_item_insert_input!]!, $subtotal: Int) {
  insert_order_one(object: {
    intent_id: $intent_id, 
    user_id: $user_id, 
    total: $total, 
    type: $type, 
    order_items: {data: $items}, 
    subtotal: $subtotal}
  ) {
    id
    intent_id,
    order_num,
    type,
    total,
    subtotal
  }
}
`;

const createOrder = async (items, user_id, type, intent, subtotal, total) => {

  if (intent === null) {
    const orderQuery = await graphql.request(CREATE_ORDER, {
      user_id,
      type,
      intent,
      total,
      items,
      subtotal,
    });

    console.log(orderQuery.insert_order_one);

    if (orderQuery.errors !== undefined) {
      console.log(orderQuery.errors);
      throw new Error("Failed to create order");
    }
    return { ...orderQuery.insert_order_one };
  } else {
    const orderQuery = await graphql.request(CREATE_ORDER, {
      user_id,
      type,
      intent_id: intent.id,
      total,
      items,
      subtotal,
    });

    console.log(orderQuery.insert_order_one);

    if (orderQuery.errors !== undefined) {
      console.log(orderQuery.errors);
      throw new Error("Failed to create order");
    }
    return { ...orderQuery.insert_order_one };
  }
};

const calculateOrderAmount = async (items) => {
  console.log(items);

  const ids = [];
  items.forEach((i) => ids.push(i.item_reference_id));

  // 1. Get all cart products
  const query = await graphql.request(GET_PRODUCTS, { items: ids });

  console.log(query)
  if (query.errors !== undefined) {
    console.log(query.errors)
    throw new Error("Failed to get references");
  }

  console.log(query.allProduct);
  // 2. Validate Products
  if (query.allProduct.length === 0) {
    throw new Error("No Products");
  }

  //* product options will be null if none are available
  //* item object
  //* {
  //*   name: <Product Name>,
  //*   item_reference_id: <Product ID>,
  //*   quantity,
  //*   selectableOption1,
  //*   selectableOption2,
  //*   multiselectOption1 > Json where each id is an index to the option string
  //* }
  //*
  let subtotal = 0;

  query.allProduct.forEach((p) => {
    //! TODO validate that options are in fact a valid choice from CMS
    // compare each item to the equivalent product and be sure the option exists
    const eqItems = items.filter((i) => i.item_reference_id === p._id);

    if (eqItems === null || eqItems.length === 0) {
      throw new Error("Invalid Item reference");
    }

    //* Could be same item with different options ** handle multiple items
    if (eqItems.length > 1) {
      eqItems.forEach((i) => {
        if (i.multiOptions !== null) {
          i.multiOptions.forEach(opt => {
            opt.choices.forEach(ch => ch.isSelected === true ? p.price += ch.price : null)
          })
        }

        if (i.singleOptions !== null) {
          i.singleOptions.forEach(opt => {
            p.price += opt.value.price
          })
        }

        subtotal += p.price * i.quantity
      });
    } else {

      if (eqItems[0].multiOptions !== null) {
        eqItems[0].multiOptions.forEach(opt => {
          opt.choices.forEach(ch => ch.isSelected === true ? p.price += ch.price : null)
        })
      }

      if (eqItems[0].singleOptions !== null) {
        eqItems[0].singleOptions.forEach(opt => {
          p.price += opt.value.price
        })
      }
      subtotal += p.price * eqItems[0].quantity;
    }
  });

  // 3. Sum items and add tax
  const tax = subtotal * query.allSettings[0].taxRate;
  const total = subtotal + tax;

  return { total, subtotal };
};

module.exports = { calculateOrderAmount, createOrder };
