/* Filename: Account.js
 *
 * Implementation of a user's account
 * Used to fetch data in and out of MongoDB database about
 * user's transactions.
 */

import apiRequest from "./api.js";

/* Classes for representing user alerts and transaction history */
export class Alert {
  constructor(data) {
    this.time = new Date(data.time);
    this.text = data.text;
  }
}

export class History {
  constructor(data) {
    this.time = new Date(data.time);
    this.value = data.value;
  }
}

export default class Account {
  // Creates a Account object with all balance fields 0
  static async load() {
    let [status, data] = await apiRequest("GET", "/account");
    return new Account(data);
  }

  // constructor for initializing data from backend (all 0 to start)
  constructor(data) {
    Object.assign(this, data);
    this._path = "/account";
  }

  // calculates new average value after adding one additional input
  _calcNewAvg(mean, size, input) {
    return (mean * size + input) / (size + 1);
  }

  // updates balance & other fields with new entered input
  async updateBalance(input) {
    this.balance += input;
    if (input < 0 && this.balance < 0) {
      alert("You are OVERBUDGET. Please plan accordingly");
    }

    // calculating largest input/expense
    this.lastTransaction = input;
    if (input > this.maxInput) {
      this.maxInput = input;
    }
    if (input < this.maxExpense) {
      this.maxExpense = input;
    }

    // for calculting average input/expenses
    if (input > 0) {
      this.avgInput = this._calcNewAvg(this.avgInput, this.numInput++, input);
    } else {
      this.avgExpense = this._calcNewAvg(this.avgExpense, this.numExpense++, input);
    }

    // update backend with new information
    await apiRequest("PATCH", this._path, {
      balance: this.balance,
      lastTransaction: this.lastTransaction,
      maxInput: this.maxInput,
      maxExpense: this.maxExpense,
      avgInput: this.avgInput,
      numInput: this.numInput,
      avgExpense: this.avgExpense,
      numExpense: this.numExpense
    });
  }

  // add alert to backend
  async addAlert(text) {
    await apiRequest("POST", `${this._path}/alerts`, {text});
  }

  // get all current alerts
  async getAlerts() {
    let [status, data] = await apiRequest("GET", `${this._path}/alertpage`);
    return (data.alerts.map(alert => new Alert(alert))).reverse(); // convert JSON to alert
  }

  // add transaction value to backend
  async addToHistory(value) {
    await apiRequest("POST", `${this._path}/history`, {value});
  }

  // get current history
  async getHistory() {
    let [status, data] = await apiRequest("GET", `${this._path}/history`);
    return data.history.map(history => new History(history));  // convert JSON to history
  };
}
