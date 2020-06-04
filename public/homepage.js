/* Filename: homepage.js
 *
 * Front-end code for managing account and making transactions
 * Handles changing quick facts, performing all calculations/error checking for
 * specified values, and showing alerts of recent activity.
 */

import Account from "./Account.js";

class App {
  // initializes elements on page
  constructor() {
    // DOM/Account objects
    this._account = null;
    this._addButton = this._withdrawButton = this._enteredTextBox = null;

    // bind event handlers
    this._onAdd = this._onAdd.bind(this);
    this._onWithdrawl = this._onWithdrawl.bind(this);
    this._loadAcct = this._loadAcct.bind(this);

    // instance variables
    this._lowBalanceShown = null;
  }

  // fills in initializations from constructor with selectors, binds event handlers
  setup() {
    // listens for cash flow activity
    this._addButton = document.querySelector("#add");
    this._addButton.addEventListener("click", this._onAdd);
    this._withdrawButton = document.querySelector("#subtract");
    this._withdrawButton.addEventListener("click", this._onWithdrawl);

    // updates data from MongoDB database when page loads
    document.addEventListener("DOMContentLoaded", this._loadAcct);
  }

  // reloads quick facts menu on sidebar with new information
  _reloadFacts() {
    // update net income statistic
    let displayedBalance = document.querySelector("#income h2");
    displayedBalance.textContent =  `$${this._account.balance.toFixed(2)}`;

    // update last transaction statistic
    let last_transac = document.querySelector("#last_transac h2");
    last_transac.textContent = `$${this._account.lastTransaction.toFixed(2)}`;

    // update largest input to date
    let max_inp = document.querySelector("#max_input h2");
    max_inp.textContent = `$${this._account.maxInput.toFixed(2)}`;

    // update largest expense to date
    let max_exp = document.querySelector("#max_expense h2");
    max_exp.textContent = `$${this._account.maxExpense.toFixed(2)}`;
  }

  // extracts and returns the text entered by the user
  _getText() {
    let textBox = document.querySelector("#enterText")
    let num = textBox.value;
    textBox.value = "";
    return num;
  }

  // initializes the color of the alert depending on transaction value
  _getAlertColor(text) {
    switch(text.substring(0, 1)) {
      case 'S':
        return "#ff776e";   // red for subtraction
        break;
      case 'A':
        return "#48ff00"    // green for addition
        break;
      default: // "L"
        return "#f2ff00"    // yellow for low balance
    }
  }

  // Adds new alert on page under parent element using Alert object
  _createAlert(parent, alert) {
    let node = document.createElement("div");
    node.classList.add("alert")

    // add alert time
    let time = document.createElement("p");
    time.textContent = alert.time;
    time.classList.add("time")
    node.appendChild(time);

    // add alert text content
    let text = document.createElement("p");
    text.textContent = alert.text;
    node.appendChild(text);
    text.style.color = this._getAlertColor(alert.text);

    parent.appendChild(node);
  }

  // reload all alerts from backend
  async _reloadAlerts() {
     // clear out all existing alerts
     let alertSection = document.querySelector("#alertDisplay");
     alertSection.innerHTML = "";

     // replace with new alerts
     let alerts = await this._account.getAlerts();
     for (let alert of alerts) {
       this._createAlert(alertSection, alert);
     }
  }

  // update backend with information from new transaction
  // addOrSubtract specifies positive or negative transaction
  async _onATMChange(addOrSubtract) {
    // check if input is valid number (must be a float >0)
    let input = Number(this._getText());
    if (isNaN(input) || input <= 0) {
      alert("Please enter a nonzero/nonnegative numerical value");
      return;
    }

    // adjust input text to add or withdraw
    let value = input;
    if (addOrSubtract === "subtract") {
      value *= -1;
    }

    // update backend
    await this._account.updateBalance(value);
    await this._account.addToHistory(value);

    // new transaction alert text
    let alertText = value > 0 ? "Added" : "Subtracted";
    alertText += `: $${Number(input).toFixed(2)}`;
    await this._account.addAlert(alertText);

    // alerts for low balance (<$15) - only show-up on subtractions
    if (value < 0 && this._account.balance < 15 && this._lowBalanceShown === null) {
      await this._account.addAlert("Low Balance: Under $15.00");
      this._lowBalanceShown = 0;
    } else if (this._account.balance > 15) {
      this._lowBalanceShown = null;
    }

    this._reloadAlerts();
    this._reloadFacts();
  }

  /*** Event Handlers ***/

  // value added
  _onAdd() {
    event.preventDefault();
    this._onATMChange("add");
  }

  // value withdrawn
  _onWithdrawl() {
    event.preventDefault();
    this._onATMChange("subtract");
  }

  // set up account when page opens
  async _loadAcct() {
    event.preventDefault();
    this._account = await Account.load();
    this._reloadFacts();
    this._reloadAlerts();
  }
}

let app = new App();
app.setup();
