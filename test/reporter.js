/* eslint no-undef: 0, no-unused-expressions: 0, callback-return: 0 */
"use strict";
var expect = require("chai").expect;
var Reporter = require("../src/reporter");
var _ = require("lodash");
var sinon = require("sinon");

var _opts = function (opts) {
  return _.merge({
    console: {
      log: function () {}
    },
    fs: {
      writeFileSync: function () {}
    },
    settings: {
      verbose: true,
      path: "."
    }
  }, opts);
};

describe("reporter", function () {
  it("should exist", function () {
    expect(Reporter).to.not.be.null;
  });

  it("should initialize", function (done) {
    var r = new Reporter(_opts());
    r.initialize().then(function () {
      expect(r.tests).to.eql([]);
      done();
    });
  });

  it("should flush", function (done) {
    var spy = sinon.spy();
    var r = new Reporter(_opts({
      console: {
        log: spy
      }
    }));
    r.initialize().then(function () {
      r.flush();
      expect(spy.called).to.be.true;
      done();
    });
  });

  it("should listen to messages", function (done) {
    var r = new Reporter(_opts({}));
    r.initialize().then(function () {
      r.listenTo(null, null, {
        addListener: function (name, cb) {
          expect(name).to.eql("message");
          expect(cb).to.not.be.null;
          cb("a", "b", {
            type: "foo"
          });
          done();
        }
      });
    });
  });

  it("should handle less than max attempts", function (done) {
    var r = new Reporter(_opts({
      settings: {
        verbose: false
      }
    }));
    r.initialize().then(function () {
      r.listenTo("a", {
        maxAttempts: 2,
        attempts: 0,
        locator: {
          title: "foo"
        }
      }, {
        addListener: function (name, cb) {
          expect(name).to.eql("message");
          expect(cb).to.not.be.null;
          cb({
            type: "worker-status",
            passed: true,
            status: "finished"
          });
          done();
        }
      });
    });
  });

  it("should handle pending", function (done) {
    var r = new Reporter(_opts({}));
    r.initialize().then(function () {
      r.listenTo("a", {
        maxAttempts: 2,
        attempts: 1,
        locator: {
          title: "foo",
          name: "abc",
          pending: true
        }
      }, {
        addListener: function (name, cb) {
          expect(name).to.eql("message");
          expect(cb).to.not.be.null;
          cb({
            type: "worker-status",
            passed: true,
            status: "finished"
          });
          try {
            r.flush();
          } catch (e) {
            console.log(e);
          }
          done();
        }
      });
    });
  });

  it("should handle a passing test", function (done) {
    var r = new Reporter(_opts({}));
    r.initialize().then(function () {
      r.listenTo("a", {
        maxAttempts: 2,
        attempts: 1,
        locator: {
          name: "abc",
          title: "foo"
        },
        runningTime: 100
      }, {
        addListener: function (name, cb) {
          expect(name).to.eql("message");
          expect(cb).to.not.be.null;
          cb({
            type: "worker-status",
            status: "weird"
          });
          cb({
            type: "worker-status",
            passed: true,
            status: "finished"
          });
          try {
            r.flush();
          } catch (e) {
            console.log(e);
          }
          done();
        }
      });
    });
  });

  it("should handle a failing test", function (done) {
    var r = new Reporter(_opts({}));
    r.initialize().then(function () {
      r.listenTo("a", {
        maxAttempts: 2,
        attempts: 1,
        locator: {
          name: "abc",
          title: "foo"
        },
        stdout: "",
        runningTime: 100
      }, {
        addListener: function (name, cb) {
          expect(name).to.eql("message");
          expect(cb).to.not.be.null;
          cb({
            type: "worker-status",
            passed: false,
            status: "finished"
          });
          try {
            r.flush();
          } catch (e) {
            console.log(e);
          }
          done();
        }
      });
    });
  });
});
