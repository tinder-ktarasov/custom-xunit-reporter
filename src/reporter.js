var BaseReporter = require('testarmada-magellan').Reporter;
var Q = require('q');
var _ = require('lodash');
var Jsonfile = require('jsonfile');

var START_TIME = (new Date()).toISOString();

var settings = {
  verbose: false,
  path: process.env.JSON_REPORT_PATH || './mocha_report.xml'
};

var Reporter = function () {
};

Reporter.prototype = {
  initialize: function () {
    this.tests = [];
    this.pending = [];
    this.passes = [];
    this.failures = [];
    this.suites = [];
    this.stats = {
      suites: 0,
      tests: 0,
      passes: 0,
      pending: 0,
      failures: 0,
      start: START_TIME,
      end: START_TIME,
      duration: 0
    };
    var deferred = Q.defer();

    deferred.resolve();
    return deferred.promise;
  },

  listenTo: function (testRun, test, source) {
    source.addListener('message', this._handleMessage.bind(this, testRun, test));
  },

  _handleMessage: function (testRun, test, msg) {
    if (settings.verbose) {
      console.log("json reporter received message: ");
      console.log(msg);
    }
    if (msg.type === 'worker-status') {
      var passCondition = msg.passed;
      var failCondition = (!msg.passed && msg.status === 'finished' && (test.maxAttempts === test.attempts + 1));
      if (passCondition || failCondition) {
        this._addResult(test, msg);
      }
    }
  },

  _addResult: function (test, msg) {
    // update total tests cases including pending ones
    this.stats.tests = this.stats.tests + 1;
    var testObject = {
      title: test.locator.title,
      fullTitle: test.locator.name,
      duration: test.runningTime,
      err: {}
    };
    this.tests.push(testObject);
    this.suites.push(test.locator.filename);
    if (msg.passed) {
      // if test is passed because of pending
      if (test.locator.pending) {
        this.stats.pending = this.stats.pending + 1;
        testObject.duration = 0;
        this.pending.push(testObject);
      } else {
        this.stats.passes = this.stats.passes + 1;
        this.passes.push(testObject);
      }
    } else {
      this.stats.failures = this.stats.failures + 1;
      // record err message & stack trace into report
      testObject.err = JSON.parse(test.stdout).failures[0].err;
      this.failures.push(testObject);
    }
  },

  flush: function () {
    // record the end time and duration
    this.stats.end = (new Date()).toISOString();
    this.stats.duration = Date.parse(this.stats.end) - Date.parse(START_TIME);
    // get the final count on suites
    this.stats.suites = _.uniq(this.suites).length;
    var testReport = {
      stats: this.stats,
      tests: this.tests,
      pending: this.pending,
      failures: this.failures,
      passes: this.passes
    };
    // write results to json files
    this._writeJsonReport(testReport);
    console.log("\n");
    console.log("============================ Report ============================");
    console.log("JSON report file is available at: ");
    console.log(settings.path);
    console.log("================================================================");
    console.log("\n");
  },

  _writeJsonReport: function (data) {
    Jsonfile.writeFileSync(settings.path, data, { flag: 'w', spaces: 2 });
  }
};

module.exports = Reporter;
