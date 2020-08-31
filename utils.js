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
    selectableOption1
    selectableOption2
    multiselectOption1   
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

const createOrder = async (items, user_id, type, intent_id, subtotal, total) => {

  if(intent_id === null){

    const {
      data: { insert_order_one },
      errors,
    } = await graphql.request(CREATE_ORDER, {
      user_id,
      type,
      intent_id,
      total,
      items,
      subtotal
    });

    if(!errors){
      console.log(errors)
      throw new Error('Failed to create order')
    }
    return { ...insert_order_one }

  }else{
    const {
      data: { insert_order_one },
      errors,
    } = await graphql.request(CREATE_ORDER, {
      user_id,
      type,
      intent_id: intent_id.client_secret,
      total,
      items,
      subtotal,
    });

    if(!errors){
      console.log(errors)
      throw new Error('Failed to create order')
    }
    return { ...insert_order_one }
  }
};

const calculateOrderAmount = async (items) => {
  console.log(items);

  const ids = [];
  items.forEach((i) => ids.push(i.item_reference_id));

  // 1. Get all cart products
  const {
    data: { allProduct, allSettings },
    errors,
  } = await graphql.request(GET_PRODUCTS, { items: ids });

  console.log(errors)
  if (errors !== null) {
    console.log(errors)
    throw new Error("Failed to get references");
  }

  console.log(allProduct);
  // 2. Validate Products
  if (allProduct.length === 0) {
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
  let subTotal = 0;

  if (allProduct.length === items.length) {
    allProduct.forEach((p) => {
      //! TODO validate that options are in fact a valid choice from CMS
      // compare each item to the equivalent product and be sure the option exists
      const eqItems = items.filter((i) => i.item_reference_id === p._id);

      if (!eqItem) {
        throw new error("Invalid Item reference");
      }

      //* Could be same item with different options ** handle multiple items
      if (eqItems.length > 1) {
        eqItems.forEach((i) => (subTotal += p.price * i.quantity));
      } else {
        subTotal += p.price * eqItem[0].quantity;
      }
    });
  } else {
    const n = items.length - allProduct.length;
    throw new Error(`ID mismatch for ${n} product(s)`);
  }

  // 3. Sum items and add tax
  const tax = subtotal * allSettings[0].taxRate;
  const total = subtotal + tax;

  return { total, subtotal };
};

module.exports = { calculateOrderAmount, createOrder };
