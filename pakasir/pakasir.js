const axios = require("axios");
const config = require("./config");

const BASE_URL = "https://app.pakasir.com/api";

const parseError = (err) =>
  err && err.response && err.response.data
    ? JSON.stringify(err.response.data)
    : (err && err.message) || String(err);

async function createQris({ amount, orderId }) {
  const url = `${BASE_URL}/transactioncreate/qris`;
  const body = {
    project: config.PAKASIR_PROJECT,
    order_id: orderId,
    amount,
    api_key: config.PAKASIR_API_KEY
  };
  try {
    const { data } = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });
    if (!data || !data.payment) {
      throw new Error("Respons tidak valid dari server Pakasir.");
    }
    return data.payment;
  } catch (err) {
    err.message = "createQris: " + parseError(err);
    throw err;
  }
}

async function getTransactionDetail({ amount, orderId }) {
  const url = `${BASE_URL}/transactiondetail`;
  const params = {
    project: config.PAKASIR_PROJECT,
    amount,
    order_id: orderId,
    api_key: config.PAKASIR_API_KEY
  };
  try {
    const { data } = await axios.get(url, { params, timeout: 30000 });
    if (!data || !data.transaction) {
      throw new Error("Respons tidak valid dari server Pakasir.");
    }
    return data.transaction;
  } catch (err) {
    err.message = "getTransactionDetail: " + parseError(err);
    throw err;
  }
}

async function simulatePayment({ amount, orderId }) {
  const url = `${BASE_URL}/paymentsimulation`;
  const body = {
    project: config.PAKASIR_PROJECT,
    order_id: orderId,
    amount,
    api_key: config.PAKASIR_API_KEY
  };
  try {
    const { data } = await axios.post(url, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 30000
    });
    return data;
  } catch (err) {
    err.message = "simulatePayment: " + parseError(err);
    throw err;
  }
}

module.exports = { createQris, getTransactionDetail, simulatePayment };
    
