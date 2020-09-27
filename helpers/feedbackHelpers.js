const tf = require("@tensorflow/tfjs");
const fetch = require("node-fetch");
const { graphql } = require('../utils')
const { GET_ORDER_BY_PK, UPDATE_ORDER_FEEDBACK, INSERT_FEEDBACK } = require('./graphqlOperations')
const moment = require("moment");

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
  const trimmed = text
    .trim()
    .toLowerCase()
    .replace(/(\.|\,|\!)/g, "")
    .split(" ");

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
};

const runSentimentAnalysis = async (text) => {
  const model = await loadModel();
  const metadata = await getMetaData();

  const prediction = predict(text, model, metadata);
  const sum = parseFloat(prediction, 10);

  return sum;
};

const createFeedback = async (comment, rating, orderId) => {
  try {
    const order = await graphql
      .request(GET_ORDER_BY_PK, { id: orderId })
      .then((data) => data.order_by_pk);

    const isWithin24Hours = moment(order.created_at)
      .add(1, "d")
      .isAfter(moment());

    if (isWithin24Hours === false) {
      throw new Error("Feedback is accepted within 24hrs of order");
    }

    let sentiment = null;
    if (comment !== null && comment !== "") {
      sentiment = await runSentimentAnalysis(comment);
    }

    const feedback = await graphql
      .request(INSERT_FEEDBACK, { comment, rating, orderId, sentiment })
      .then((data) => {
        return data.insert_feedback_one;
      });

    await graphql.request(UPDATE_ORDER_FEEDBACK, {
      id: orderId,
      feedbackId: feedback.id,
    });

    return feedback.id;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create Feedback");
  }
};

module.exports = { createFeedback }