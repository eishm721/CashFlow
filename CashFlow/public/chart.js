/* Filename: chart.js
 *
 * Front-end code for data visualization component
 * Uses Chart.js package for creating graphical models
 */

import Account from "./Account.js";

// clean up a lot of code
// update comments
// define constants instead of magic numbers
// google auth + homepage for that?

/* Define time constants */
const MS_IN_SEC = 1000;
const SEC_IN_MIN = 60;
const MIN_IN_HR = 60;
const HR_IN_DAY = 24;
const QUADYEAR = 4;
const CENTURY = 100;

class Grapher {
  // initializes elements on page
  constructor() {
    // DOM/Account objects
    this._account = null;
    this._netButton = this._depositButton = this._expensesButton = null;
    this._allButton = this._dayButton = this._monthButton = null;

    // bind event handlers
    this._showNet = this._showNet.bind(this);
    this._showDeposit = this._showDeposit.bind(this);
    this._showExpense = this._showExpense.bind(this);

    this._showAll = this._showAll.bind(this);
    this._showDay = this._showDay.bind(this);
    this._showMonth = this._showMonth.bind(this);

    this._loadAcct = this._loadAcct.bind(this);

    // default display types
    this._displayType = "overall";
    this._dateType = "date";
  }

  // fills in initializations from constructor with selectors, binds event handlers
  setup() {
    // listens for which graph to display
    this._netButton = document.querySelector("#net");
    this._netButton.addEventListener("click", this._showNet);
    this._depositButton = document.querySelector("#deposit");
    this._depositButton.addEventListener("click", this._showDeposit);
    this._expensesButton = document.querySelector("#withdrawl");
    this._expensesButton.addEventListener("click", this._showExpense);

    // listens for what timescale to use in grapher
    this._allButton = document.querySelector("#all");
    this._allButton.addEventListener("click", this._showAll);
    this._dayButton = document.querySelector("#day");
    this._dayButton.addEventListener("click", this._showDay);
    this._monthButton = document.querySelector("#month");
    this._monthButton.addEventListener("click", this._showMonth);

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

    // update avg input to date
    let avg_inp = document.querySelector("#avg_input h2");
    avg_inp.textContent = `$${this._account.avgInput.toFixed(2)}`;

    // update avg expense to date
    let avg_exp = document.querySelector("#avg_expense h2");
    avg_exp.textContent = `$${this._account.avgExpense.toFixed(2)}`;
  }

  /* Time-related computations */

  // calculates number of days in given month (1-12) in a given year
  _numDaysInMonth(month, year) {
    if ([1, 3, 5, 7, 8, 10, 12].includes(month)) {
      return 31;
    } else if ([4, 6, 9, 11].includes(month)) {
      return 30;
    }
    let isLeapYear = (year % CENTURY === 0) ? (year % (4 * CENTURY) === 0) : (year % QUADYEAR === 0);
    return isLeapYear ? 29 : 28;
  }

  // calculates the number of hours from a past Date object to now
  _numHoursToNow(old, now) {
    let ms = now.getTime() - old.getTime();
    return ms / (MS_IN_SEC * SEC_IN_MIN * MIN_IN_HR);
  }

  // calculates and returns various time information about right now using Date object
  _currentTimeInfo() {
    let now = new Date();
    let currMonth = now.getMonth() + 1;
    let currYear = now.getFullYear();
    let monthLength = this._numDaysInMonth(currMonth, currYear);
    let currDay = now.getDate();
    return { now, currMonth, currYear, monthLength, currDay };
  }

  // clears out and initializes blank canvas for Chart.js graph
  _createCanvas() {
    let node = document.querySelector("#actualGraph");
    node.innerHTML = "";
    let newGraph = document.createElement("canvas");
    newGraph.classList.add("historyGraph");
    node.appendChild(newGraph);
    return newGraph;
  }

  // create a graph title using type and timescale of the current selection
  _createTitle() {
    // set time component of title
    let {now, currMonth, currDay} = this._currentTimeInfo();
    let first = "All Time";
    if (this._dateType === "month") {
      first = `This Month (${currMonth}/1 – ${currMonth}/${this._numDaysInMonth(currMonth, now.getFullYear())})`;
    } else if (this._dateType === "date") {
      first = `Today (${currMonth}/${currDay})`;
    }

    // set which transaction to view in title
    let second = "Net";
    if (this._displayType === "deposit") {
      second = "Deposit";
    } else if (this._displayType === "withdrawl") {
      second = "Withdrawl";
    }
    return `${first}: ${second} Transactions`;
  }

  // set graph colors for different types of transactions
  _getBarColors() {
    switch(this._displayType) {
      case "overall":
        return {
          bgColor: "rgba(255, 247, 0, 0.6)",    // yellow
          borderColor: "rgba(168, 146, 0, 1)",
          min: 0,
          max: 10
        }
      case "deposit":
        return {
          bgColor: "rgba(100, 255, 134, 0.6)",   // green
          borderColor: "rgba(0, 153, 20, 1)",
          min: 0,
          max: 10
        }
      default:  // "withdrawl"
        return {
          bgColor: "rgba(250, 185, 185, 0.6)",  // red
          borderColor: "rgba(255, 77, 77, 1)",
          min: 0,
          max: 10
        }
    }
  }

  // Creates an x-axis label for the time of the graph based on specified timescale
  _getXAxisLabel() {
    switch(this._dateType) {
      case "month":
        return "Day of Month";
      case "date":
        return "Hours";
      default: // "all"
        return "Hours Since First Transaction";
    }
  }

  // rounds all values to 2 decimal places (currency)
  _roundValues(amounts) {
    let values = [];
    for (let val of amounts) {
      // make expenses still show as positive values on the graph
      if (this._displayType === "withdrawl") {
        val *= -1;
      }
      values.push(Number(val.toFixed(2)));
    }
    return values;
  }

  // create a populated graph object on a newly created canvas
  // using array of time dates and transaction values
  _makeGraph(dates, amounts) {
    // initialize colors, styling for axies, and page title
    document.querySelector("#graphBox h1").textContent = this._createTitle();
    let {bgColor, borderColor, min, max} = this._getBarColors(type);
    let yAxis = [{
        // axis label
        scaleLabel: {
          display: true,
          labelString: "Amount ($)",
          fontFamily: "Open Sans, sans-serif",
          fontColor: bgColor,
          fontStyle: 'bold',
          fontSize: 25,
        },
        // ticks/line demarcations
        ticks: {
            fontFamily: "Open Sans, sans-serif",
            fontColor: bgColor,
            fontSize: 20,
            suggestedMin: min,
            suggestedMax: max
        },
        gridLines: {
          zeroLineWidth: 1.5
        }
    }];
    let xAxis = JSON.parse(JSON.stringify(yAxis));   // deep copy
    xAxis[0].scaleLabel.labelString = this._getXAxisLabel();

    console.log(yAxis);
    // create chart using Chart.js data visualization tool
    let myChart = new Chart(this._createCanvas(), {
      type: 'bar',
      data: {
        // initialize data arrays and bar properties
        labels: dates,
        datasets: [{
          label: this._createTitle(),
          data: this._roundValues(amounts),
          backgroundColor: bgColor,
          hoverBackgroundColor: borderColor,
          borderColor: borderColor,
          borderWidth: 1,
          barPercentage: 1.1
        }]
      },
      options: {
        // menu that appears when hovering
        tooltips: {
          titleFontSize: 24,
          titleFontFamily: "Open Sans, sans-serif",
          bodyFontSize: 18,
          bodyFontFamily: "Open Sans, sans-serif",
        },
        legend: {
          display: false
        },
        scales: {
            yAxes: yAxis,
            xAxes: xAxis
        }
      }
    });
  }

  // returns number of elements to be in x-axis array
  _getXAxisLength(currMonth, currYear, oldest, now) {
    switch(this._dateType) {
      case "date":
        return HR_IN_DAY;
      case "month":
        return this._numDaysInMonth(currMonth, currYear);
      default:
        return Math.ceil(this._numHoursToNow(oldest, now));
    }
  }

  // creates arrays with preset values of given length
  _initializeBlankAxes(length) {
    // array from 1 to length
    let x = [...Array(length).keys()];
    if (this._dateType === "month") {
      x = x.map(a => a + 1);
    }
    // length # of 0s
    let values = Array(length).fill(0)
    return { x, values };
  }

  // fetches history data of all transactions, processes, and graphs using Chart.js
  // async to fetch transaction history
  async _processDataAndGraph() {
    // initialize data, storage arrays, time information
    let history = await this._account.getHistory();
    if (history.length === 0) return;
    let {now, currMonth, currYear, monthLength, currDay} = this._currentTimeInfo();
    let arrLength = this._getXAxisLength(currMonth, currYear, history[0].time, now);
    let {x, values} = this._initializeBlankAxes(arrLength);

    for (let {value, time} of history) {
      // whether or not to include transaction in current display
      if (this._dateType === 'all' || (time.getMonth() + 1 === currMonth && time.getFullYear() === currYear)) {
        let date = time.getDate();
        let hour = time.getHours();
        if (!(this._dateType === "date" && date !== currDay)) {
          // adjust for what type of transactions to display
          if (!((this._displayType === "deposit" && value < 0) || (this._displayType === "withdrawl" && value > 0))) {

            // compute what index in initialized arrays to update to show correct value
            let toUpdate = arrLength - Math.floor(this._numHoursToNow(time, now)) - 1;  // if this._dateType == "all"
            if (this._dateType === "date") {
              toUpdate = hour;
            } else if (this._dateType === "month") {
              toUpdate = date - 1;
            }
            values[toUpdate] += value;
          }
        }
      }
    }
    this._makeGraph(x, values);
  }

  /*** Event Handlers ***/

  // show net income/expenses
  _showNet() {
    event.preventDefault();
    this._displayType = "overall";
    this._processDataAndGraph();
  }

  // show deposit history
  _showDeposit() {
    event.preventDefault();
    this._displayType = "deposit";
    this._processDataAndGraph();
  }

  // show expense history
  _showExpense() {
    event.preventDefault();
    this._displayType = "withdrawl";
    this._processDataAndGraph();
  }

  // show entire time scale of history
  _showAll() {
    event.preventDefault();
    this._dateType = "all";
    this._processDataAndGraph();
  }

  // show current day's history
  _showDay() {
    event.preventDefault();
    this._dateType = "date";
    this._processDataAndGraph();
  }

  // show current month's history
  _showMonth() {
    event.preventDefault();
    this._dateType = "month";
    this._processDataAndGraph();
  }

  // set up account when page opens - async to fetch account
  async _loadAcct() {
    event.preventDefault();
    this._account = await Account.load();
    this._reloadFacts();
    this._processDataAndGraph();
  }
}

let grapher = new Grapher();
grapher.setup();
