/* eslint no-undef: 0, no-unused-expressions: 0, callback-return: 0, no-console: 0 */
"use strict";
const expect = require("chai").expect;
const Reporter = require("../src/reporter");
const _ = require("lodash");
const sinon = require("sinon");

const _opts = (opts) => {
  return _.merge({
    console: {
      log: () => {}
    },
    fs: {
      writeFileSync: () => {}
    },
    settings: {
      verbose: true,
      path: "."
    }
  }, opts);
};

describe("reporter", () => {
  it("should exist", () => {
    expect(Reporter).to.not.be.null;
  });

  it("should initialize", (done) => {
    const r = new Reporter(_opts());
    r.initialize().then(() => {
      expect(r.tests).to.eql([]);
      done();
    });
  });

  it("should flush", (done) => {
    const spy = sinon.spy();
    const r = new Reporter(_opts({
      console: {
        log: spy
      }
    }));
    r.initialize().then(() => {
      r.flush();
      expect(spy.called).to.be.true;
      done();
    });
  });

  it("should listen to messages", (done) => {
    const r = new Reporter(_opts({}));
    r.initialize().then(() => {
      r.listenTo(null, null, {
        addListener: (name, cb) => {
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

  it("should handle less than max attempts", (done) => {
    const r = new Reporter(_opts({
      settings: {
        verbose: false
      }
    }));
    r.initialize().then(() => {
      r.listenTo("a", {
        maxAttempts: 2,
        attempts: 0,
        locator: {
          title: "foo"
        }
      }, {
        addListener: (name, cb) => {
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

  it("should handle pending", (done) => {
    const r = new Reporter(_opts({}));
    r.initialize().then(() => {
      r.listenTo("a", {
        maxAttempts: 2,
        attempts: 1,
        locator: {
          title: "foo",
          name: "abc",
          pending: true
        }
      }, {
        addListener: (name, cb) => {
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

  it("should handle a passing test", (done) => {
    const r = new Reporter(_opts({}));
    r.initialize().then(() => {
      r.listenTo("a", {
        maxAttempts: 2,
        attempts: 1,
        locator: {
          name: "abc",
          title: "foo"
        },
        runningTime: 100
      }, {
        addListener: (name, cb) => {
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

  it("should handle a failing test", (done) => {
    const r = new Reporter(_opts({}));
    r.initialize().then(() => {
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
        addListener: (name, cb) => {
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
