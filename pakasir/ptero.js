const axios = require("axios");
const config = require("./config");

const BASE = config.PTERO_DOMAIN;

function headers() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: "Bearer " + config.PTERO_API_KEY
  };
}

async function createUser({
  email,
  username,
  first_name,
  last_name,
  password,
  root_admin = false
}) {
  const url = BASE + "/api/application/users";

  const body = {
    email,
    username,
    first_name,
    last_name,
    language: "en",
    password,
    root_admin
  };

  const { data } = await axios.post(url, body, {
    headers: headers(),
    timeout: 30000
  });

  if (data.errors) throw new Error(JSON.stringify(data.errors[0]));
  return data.attributes;
}

async function getEggStartup() {
  const url =
    BASE + `/api/application/nests/${config.PTERO_NEST_ID}/eggs/${config.PTERO_EGG}`;
  const { data } = await axios.get(url, { headers: headers(), timeout: 30000 });
  return data.attributes.startup;
}

async function createServer({ name, description, userId, ram, disk, cpu, featureLimits }) {
  const url = BASE + "/api/application/servers";
  const startup = await getEggStartup();
  const body = {
    name,
    description,
    user: userId,
    egg: parseInt(config.PTERO_EGG),
    docker_image: "ghcr.io/parkervcp/yolks:nodejs_20",
    startup,
    environment: {
      INST: "npm",
      USER_UPLOAD: "0",
      AUTO_UPDATE: "0",
      CMD_RUN: "npm start"
    },
    limits: {
      memory: ram,
      swap: 0,
      disk,
      io: 500,
      cpu
    },
    feature_limits: featureLimits || {
      databases: 5,
      backups: 5,
      allocations: 5
    },
    deploy: {
      locations: [parseInt(config.PTERO_LOC)],
      dedicated_ip: false,
      port_range: []
    }
  };
  const { data } = await axios.post(url, body, {
    headers: headers(),
    timeout: 60000
  });
  if (data.errors) throw new Error(JSON.stringify(data.errors[0]));
  return data.attributes;
}

module.exports = { createUser, createServer };
  
