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

const GET_PRODUCT = `
  query($id: ID!){
    Product(id: $id){
      _id
      price
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

const GET_REWARDS_BY_PK = `
  query($id: uuid!){
    reward_by_pk(id: $id){
      id
      item_id
      reward_type
      price_off
      percent_off
      name
      point_cost
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
mutation ($rewardId: uuid, $intent: String, $payment: jsonb, $user_id: uuid, $total: Int, $type: order_type_enum, $items: [order_item_insert_input!]!, $subtotal: Int) {
  insert_order_one(object: {
    intent_id: $intent
    payment: $payment, 
    user_id: $user_id, 
    total: $total, 
    type: $type, 
    reward_id: $rewardId
    order_items: {data: $items}, 
    state_enum: INITIATED
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

const UPDATE_ORDER = `
mutation($id: uuid!, $payment: jsonb){
  update_order_by_pk(
    pk_columns:{id:$id}
    _set: {
      state_enum: CREATED
      payment: $payment
    }
  ){
    id
    state_enum
    reward_redemption {
      reward_id
    }
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
      intent_id
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

const CANCEL_ORDER = `
  mutation($id: uuid!, $payment: jsonb){
  update_order_by_pk(pk_columns: {id: $id} _set: {
    state_enum : CANCELLED
    payment: $payment
  }){
    id
		state_enum
  }
}
`;

const CREATE_REWARD_REDEMPT = `
  mutation($discountAmount: Int, $rewardId: uuid, $user_id: uuid){
    insert_reward_redemption_one(
      object: {
        discount_amount: $discountAmount
        reward_id: $rewardId
        user_id: $user_id
      }
    ){
      id
    }
  }
`;

const UPDATE_ORDER_WITH_REFUND = `
mutation($id: uuid!, $refundId: String){
  update_order_by_pk(pk_columns: {id: $id}
  	_set: {
      refund_id: $refundId
      state_enum: REFUNDED
    }
  ){
    id
  }
}
`;

module.exports = {
  CREATE_REWARD_REDEMPT,
  UPDATE_ORDER_FEEDBACK,
  GET_ORDER_BY_PK,
  GET_PRODUCTS,
  GET_PRODUCT,
  REWARD_POINTS,
  GET_REWARDS_BY_PK,
  UPDATE_POINTS,
  CREATE_ORDER,
  UPDATE_ORDER,
  INSERT_FEEDBACK,
  DEVICESIGNUP,
  CANCEL_ORDER,
  UPDATE_ORDER_WITH_REFUND,
};
