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

const REWARD_POINTS = `
  query($id: uuid!){
    user_by_pk(id: $id){
      reward_points
    }
  }
`;

const UPDATE_POINTS = `
mutation($points: Int, $id: uuid!){
	update_user_by_pk(
    pk_columns: {id: $id}
    _set: {reward_points: $points}
  ){
    reward_points
    
  }
}`;

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

const DEVICESIGNUP = `
  mutation($email: String, $password: String){
    insert_device(objects:{
      email: $email
      password: $password
    }){
      returning{
        id
      }
    }
  }
`;

const createNewDevice = async (email, password) => {

  try {
    
    const device = await graphql.request(DEVICESIGNUP, { email, password }).then( data => {
      return data.insert_device.returning[0]
    })
  
    return device.id

  } catch (error) {
    console.log(error)
    throw new Error("Failed to create device")
  }

}

const adjustRewardPoints = async (subtotal, user_id) => {
  const pointsQuery = await graphql.request(REWARD_POINTS, { id: user_id});

  if(pointsQuery.errors !== undefined){
    console.log(pointsQuery.errors)
    throw new Error('Failed To get user points')
  }

  const oldPoints = pointsQuery.user_by_pk.reward_points;

  const newPoints = (subtotal * .01).toFixed(0);

  const points = oldPoints + newPoints;

  return await graphql.request(UPDATE_POINTS, { id: user_id, points });
}

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

    if (orderQuery.errors !== undefined) {
      console.log(orderQuery.errors);
      throw new Error("Failed to create order");
    }
    return { ...orderQuery.insert_order_one };
  }
};

const calculateOrderAmount = async (items) => {


  const ids = [];
  items.forEach((i) => ids.push(i.item_reference_id));

  // 1. Get all cart products
  const query = await graphql.request(GET_PRODUCTS, { items: ids });

  if (query.errors !== undefined) {
    console.log(query.errors)
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
          i.options.forEach(opt => {
            if (opt.value !== undefined || opt.value !== null) {
              p.price += opt.value.price
            } else {
              opt.choices.forEach(ch => ch.isSelected === true ? p.price += ch.price : null)
            }
          })
        }

        subtotal += p.price * i.quantity
      });
    } else {

      if (eqItems[0].options !== null) {
        eqItems[0].options.forEach(opt => {
          if (opt.value !== undefined || opt.value !== null) {
            p.price += opt.value.price
          } else {
            opt.choices.forEach(ch => ch.isSelected === true ? p.price += ch.price : null)
          }
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

module.exports = { calculateOrderAmount, createOrder, adjustRewardPoints, createNewDevice };
