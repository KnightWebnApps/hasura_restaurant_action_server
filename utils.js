const { GraphQLClient } = require("graphql-request");
const moment = require('moment');
const tf = require("@tensorflow/tfjs");
const fetch = require("node-fetch");

require("dotenv").config();

const graphql = new GraphQLClient(process.env.ENDPOINT, {
  headers: {
    "content-type": 'application/json',
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
mutation ($intent: String, $payment: jsonb, $user_id: uuid, $total: Int, $type: order_type_enum, $items: [order_item_insert_input!]!, $subtotal: Int) {
  insert_order_one(object: {
    intent_id: $intent
    payment: $payment, 
    user_id: $user_id, 
    total: $total, 
    type: $type, 
    order_items: {data: $items}, 
    subtotal: $subtotal}
  ) {
    id
    payment
    order_num,
    type,
    total,
    subtotal,
    intent_id
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

const INSERT_FEEDBACK = `
  mutation($orderId: uuid, $comment: String, $rating: Int, $sentiment: float8){
    insert_feedback_one(object: {
      comment: $comment
      rating: $rating
      order_id: $orderId
      sentiment_score: $sentiment
    }){
      id
    }
  }
`;

const GET_ORDER_BY_PK = `
  query($id: uuid!){
    order_by_pk(id: $id){
      created_at
      completed_at
      feedback_id
    }
  }
`;

const UPDATE_ORDER_FEEDBACK = `
  mutation($id: uuid!, $feedbackId: uuid!){
    update_order_by_pk(pk_columns: {id: $id}, _set: {
      feedback_id: $feedbackId
    }){
      id
    }
  }
`;

const getMetaData = async () => {
  const metadata = await fetch(
    "https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/metadata.json"
  );
  return metadata.json();
};

const padSequences = (sequences, metadata) => {
  return sequences.map((seq) => {
    if (seq.length > metadata.max_len) {
      seq.splice(0, seq.length - metadata.max_len);
    }
    if (seq.length < metadata.max_len) {
      const pad = [];
      for (let i = 0; i < metadata.max_len - seq.length; ++i) {
        pad.push(0);
      }
      seq = pad.concat(seq);
    }
    return seq;
  });
};

const loadModel = async () => {
  const url = `https://storage.googleapis.com/tfjs-models/tfjs/sentiment_cnn_v1/model.json`;
  const model = await tf.loadLayersModel(url);
  return model;
};

const predict = (text, model, metadata) => {
  const trimmed = text.trim().toLowerCase().replace(/(\.|\,|\!)/g, '').split(' ');

  const sequence = trimmed.map((word) => {
    const wordIndex = metadata.word_index[word];
    if (typeof wordIndex === "undefined") {
      return 2; //oov_index
    }

    return wordIndex + metadata.index_from;
  });

  const paddedSequence = padSequences([sequence], metadata);
  const input = tf.tensor2d(paddedSequence, [1, metadata.max_len]);

  const predictOut = model.predict(input);
  const score = predictOut.dataSync()[0];
  predictOut.dispose();
  return score;
}

const runSentimentAnalysis = async (text) => {
  const model = await loadModel();
  const metadata = await getMetaData();

  const prediction = predict(text, model, metadata);
  const sum = parseFloat(prediction, 10);

  return sum;
};

const createFeedback = async (comment, rating, orderId) => {
  try {
    const order = await graphql.request(GET_ORDER_BY_PK, { id: orderId }).then( data => data.order_by_pk);

    const isWithin24Hours = moment(order.created_at).add(1, 'd').isAfter(moment());

    if(isWithin24Hours === false){
      throw new Error('Feedback is accepted within 24hrs of order')
    }

    let sentiment = null;
    if(comment !== null && comment !== ""){
      sentiment = await runSentimentAnalysis(comment);
    }

    const feedback = await graphql.request(INSERT_FEEDBACK, { comment, rating, orderId, sentiment }).then( data => {
      return data.insert_feedback_one
    })

    await graphql.request(UPDATE_ORDER_FEEDBACK, { id: orderId, feedbackId: feedback.id})

    return feedback.id

  } catch (error) {
    console.error(error)
    throw new Error("Failed to create Feedback")
  }
}


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
  const pointsQuery = await graphql.request(REWARD_POINTS, { id: user_id });

  if(pointsQuery.errors !== undefined){
    console.log(pointsQuery.errors)
    throw new Error('Failed To get user points')
  }

  const oldPoints = pointsQuery.user_by_pk.reward_points;

  const points = oldPoints + 10;

  return await graphql.request(UPDATE_POINTS, { id: user_id, points });
}

const createOrder = async (items, user_id, type, intent, subtotal, total) => {

  
    const orderQuery = await graphql.request(CREATE_ORDER, {
      user_id,
      type,
      payment: intent,
      intent: intent.id,
      total,
      items,
      subtotal,
    }); 

    if (orderQuery.errors !== undefined) {
      console.log(orderQuery.errors);
      throw new Error("Failed to create order");
    }

    return { ...orderQuery.insert_order_one };
  
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
          if (opt.value === undefined) {
            opt.choices.forEach(ch => ch.isSelected === true ? p.price += ch.price : null)
          } else {
            p.price += opt.value.price
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

module.exports = { calculateOrderAmount, createOrder, adjustRewardPoints, createNewDevice, createFeedback };
