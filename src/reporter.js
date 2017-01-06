/* eslint no-magic-numbers: 0, no-invalid-this: 0, max-statements: 0, prefer-template: 0 */
"use strict";
const Q = require("q");
const _ = require("lodash");
const Parser = require("xml2json");
const fs = require("fs");

const START_TIME = (new Date()).toISOString();

const settings = {
  verbose: false,
  path: process.env.XUNIT_REPORT_PATH || "./mocha_report.xml"
};

class Reporter {
  constructor(opts) {
    this.opts = _.assign({
      fs,
      console,
      settings
    }, opts);
  }

  initialize() {
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
    const deferred = Q.defer();

    deferred.resolve();
    return deferred.promise;
  }

  listenTo(testRun, test, source) {
    source.addListener("message", this._handleMessage.bind(this, testRun, test));
  }

  _handleMessage(testRun, test, msg) {
    if (this.opts.settings.verbose) {
      this.opts.console.log("json reporter received message: ");
      this.opts.console.log(msg);
    }
    if (msg.type === "worker-status") {
      const passCondition = msg.passed;
      const failCondition =
        !msg.passed && msg.status === "finished" && test.maxAttempts === test.attempts + 1;
      if (passCondition || failCondition) {
        this._addResult(test, msg);
      }
    }
  }

  _addResult(test, msg) {
    // update total tests cases including pending ones
    this.stats.tests = this.stats.tests + 1;
    const testObject = {
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
      try {
        let s = test.stdout.replace(
          /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
          "");
        // remove timestamp added by Magellan before each line
        s = s.split("\n").map((line) => {
          return line.substr(9);
        }).join("\n");
        const passesIndex = s.indexOf("\"passes\": [");
        const endOfPasses = s.indexOf("]", passesIndex);
        // Remove everything after the last closing curly brace
        s = s.substring(0, s.indexOf("}", endOfPasses) + 1);
        // Remove everything before {"stats"
        s = "{" + s.substring(s.indexOf("\"stats\""));
        s = s.replace(/(\r\n|\n|\r)/gm, ""); // Remove all line breaks
        testObject.err = JSON.parse(s).failures[0].err;
      } catch (err) {
        testObject.err = "Unknown error (test was killed?) " + err;
      }
      this.failures.push(testObject);
    }
  }

  flush() {
    // record the end time and duration
    this.stats.end = (new Date()).toISOString();
    this.stats.duration = Date.parse(this.stats.end) - Date.parse(START_TIME);
    // get the final count on suites
    this.stats.suites = _.uniq(this.suites).length;
    const testReport = {
      stats: this.stats,
      tests: this.tests,
      pending: this.pending,
      failures: this.failures,
      passes: this.passes
    };
    // write results to xml files
    this._writeXmlReport(testReport);

    this.opts.console.log("\n");
    this.opts.console.log("============================ Report ============================");
    this.opts.console.log("xUnit report file is available at: ");
    this.opts.console.log(this.opts.settings.path);
    this.opts.console.log("================================================================");
    this.opts.console.log("\n");
  }

  _writeXmlReport(data) {
    const jsonReport = {
      testsuite: {
        name: "Mocha Tests",
        tests: data.stats.tests,
        failures: data.stats.failures,
        errors: data.stats.failures,
        skipped: data.stats.pending,
        timestamp: (new Date()).toGMTString(),
        time: data.stats.duration / 1000,
        testcase: []
      }
    };

    data.tests.forEach((test) => {
      const testcase = {
        classname: test.fullTitle.replace(test.title, ""),
        name: test.title,
        time: test.duration / 1000
      };
      // write error if test failed
      if (!_.isEmpty(test.err)) {
        testcase.failure = { "$t": "<![CDATA[" + test.err.stack + "]]>" };
      }
      // handle pending test
      if (test.duration === 0) {
        testcase.time = "NaN";
        testcase.skipped = {};
      }
      jsonReport.testsuite.testcase.push(testcase);
    });
    this.opts.fs.writeFileSync(this.opts.settings.path,
      Parser.toXml(jsonReport, { sanitize: true }));
  }
}

module.exports = Reporter;
