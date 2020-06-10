/* Filename: index.js
 *
 * Backend using Node.js and Express for managing fetch
 * for an user's account, storing info in MongoDB
 *
 * Specifies all REST API routes to be used
 */

"use strict";

/* Constants and initializations */
const bodyParser = require("body-parser");
const cors = require("cors");
const express = require("express");
const { MongoClient } = require("mongodb");

const MAX_ALERTS = 5;
const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost";

let DATABASE_NAME = "cashflow";
let api = express.Router();
let conn;
let db;
let Account;
let Alerts;
let History;

module.exports = async (app) => {
  app.set("json spaces", 2);
  app.use("/api", api);

  /* Connect to MongoDB */
  conn = await MongoClient.connect(MONGODB_URL, { useUnifiedTopology: true });
  db = conn.db(DATABASE_NAME);
  Account = db.collection("account");
  Alerts = db.collection("alerts");
  History = db.collection("history");
};

api.use(cors());
api.use(bodyParser.json());

// verified successful API pipeline
api.get("/", (req, res) => {
  res.json({ success: true });
});

// Middleware to get balance information about user
api.use("/account", async (req, res, next) => {
  let account = await Account.findOne();
  if (!account) {
    // if account not found, create it
    await Account.insertOne({
      balance: 0,
      lastTransaction: 0,
      maxInput: 0,
      maxExpense: 0,
      avgInput: 0,
      numInput: 0,
      avgExpense: 0,
      numExpense: 0
    });
    account = await Account.findOne()
  }
  let { balance, lastTransaction, maxInput, maxExpense, avgInput, numInput, avgExpense, numExpense } = account;
  res.locals = { balance, lastTransaction, maxInput, maxExpense, avgInput, numInput, avgExpense, numExpense };
  next();
});

// get current account information by calling the middleware
api.get("/account", async (req, res) => {
  res.json(res.locals);
});

// update current account balance with transaction value
api.patch("/account", async(req, res) => {
  await Account.replaceOne({}, req.body);
  res.json(req.body);
});

// Load array of 5 most recent alerts to show
api.get("/account/alertpage", async (req, res) => {
  let alerts = await Alerts.find().toArray();
  res.json({alerts});
});

// add a new alert on a new transaction, ensuring max of 5 alerts shown
api.post("/account/alerts", async (req, res) => {
  let alert = req.body;
  if (!("text" in alert) || alert.text === "") {
    // if alert text not specified correctly in request body
    res.status(400).json({error: "no alert specified"});
    return;
  }
  // new alert appended to end of array
  await Alerts.insertOne({time: new Date(), text: alert.text});

  // remove oldest alert if more than 5 alerts
  let allAlerts = await Alerts.find().toArray();
  if (allAlerts.length > MAX_ALERTS) {
    let toRemove = allAlerts[0]._id;
    Alerts.deleteOne({_id: toRemove});
  }
  res.json({success: true});
});

// get history of all transactions made
api.get("/account/history", async (req, res) => {
  let history = await History.find().toArray();
  res.json({history});
});

// add new transaction w/ time stamp to history of all transactions made
api.post("/account/history", async (req, res) => {
  let transaction = req.body;
  if (!("value" in transaction) || transaction.value === "") {
    // value not specified correctly in request body
    res.status(400).json({error: "no value specified"});
    return;
  }

  // add new transaction to current history database
  await History.insertOne({value: transaction.value, time: new Date()});
  res.json({success: true});
})
