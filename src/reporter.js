var Q = require('q');
var _ = require('lodash');
var Parser = require('xml2json');
var Fs = require('fs');
var path = require('path');


var START_TIME = (new Date()).toISOString();

var settings = {
  verbose: false,
  path: process.env.XUNIT_REPORT_PATH || './mocha_report.xml'
};

var Reporter = function () {
};

Reporter.prototype = {
  initialize: function () {
    this.pending = [];
    this.passes = [];
    this.failures = [];
    this.suites = {};
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
    var classFile = test.locator.filename.split(path.sep).pop();
    var module = classFile.slice(0, classFile.lastIndexOf('.'));

    var suite = test.profile.nightwatchEnv + " : " + module;
    var testObject = {
      name: test.locator.testcase,
      classname: suite,
      duration: test.runningTime,
      err: {}
    };
    if (typeof this.suites[suite] === 'undefined') {
      this.suites[suite] = {
        name: suite,
        environment: test.profile.nightwatchEnv,
        tests: {},
        timestamp: new Date(test.startTime).toISOString(),
        stats: {
          suites: 0,
          tests: 0,
          passes: 0,
          pending: 0,
          failures: 0,
          duration: 0
        }
      };
    }
    this.suites[suite].tests[test.locator.toString()] = testObject;

    this.suites[suite].stats.duration += test.runningTime;
    if (msg.passed) {
      // if test is passed because of pending
      if (test.locator.pending) {
        this.stats.pending += 1;
        this.suites[suite].stats.pending += 1;
        testObject.duration = 0;
        this.pending.push(testObject);
      } else {
        this.stats.passes += 1;
        this.suites[suite].stats.passes += 1;
        this.passes.push(testObject);
      }
    } else {
      this.stats.failures += 1;
      this.suites[suite].stats.failures += 1;

      // record err message into report
      testObject.err = test.stdout.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '')
      this.failures.push(testObject);
    }
  },

  flush: function () {
    // record the end time and duration
    this.stats.end = (new Date()).toISOString();
    this.stats.duration = Date.parse(this.stats.end) - Date.parse(START_TIME);
    // get the final count on suites
    this.stats.suites = this.suites.length;
    var testReport = {
      stats: this.stats,
      suites: this.suites,
      pending: this.pending,
      failures: this.failures,
      passes: this.passes
    };
    // write results to xml files
    this._writeXmlReport(testReport);

    console.log("\n");
    console.log("============================ Report ============================");
    console.log("xUnit report file is available at: ");
    console.log(settings.path);
    console.log("================================================================");
    console.log("\n");
  },

  _writeXmlReport: function (data) {
    var jsonReport = {
      testsuites: {
        tests: data.stats.tests,
        failures: data.stats.failures,
        errors: data.stats.failures,

        testsuite: []
      }
    };

    _.forOwn(data.suites, function (suite, suiteName) {
      var suiteReport = {
        name: suiteName,
        package: suiteName.environment,
        testcase: [],

        tests: Object.keys(suite.tests).length,
        failures: suite.stats.failures,
        errors: suite.stats.failures,
        skipped: suite.stats.pending,
        time: suite.stats.duration / 1000,
        timestamp: suite.stats.timestamp
      };

      jsonReport.testsuites.testsuite.push(suiteReport);

      _.forOwn(suite.tests, function (test) {
        var testcase = {
          classname: test.classname,
          name: test.name,
          time: test.duration / 1000
        };
        // write error if test failed
        if (!_.isEmpty(test.err)) {
          testcase.failure = { '$t': '<![CDATA[' + test.err + ']]>' };
        }
        // handle pending test
        if (test.duration === 0) {
          testcase.time = 'NaN';
          testcase.skipped = {};
        }
        suiteReport.testcase.push(testcase);
      });
    });
    Fs.writeFileSync(settings.path, Parser.toXml(jsonReport, { sanitize: true }));
  }
};

module.exports = Reporter;
