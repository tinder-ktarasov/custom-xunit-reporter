# Magellan xUnit Reporter Plugin

This project is a plugin for Magellan which allows you to report test information in a XML file in xUnit format.

# Installation

Install the npm module in your node project:

```shell
npm install --save testarmada-magellan-xunit-reporter
```

Add the plugin to `magellan.json` in the `reporters` list (note: if this file doesn't exist, create it)

```json
{
  "reporters": [
    "testarmada-magellan-xunit-reporter"
  ]
}
```

# Configuration

This plugin is configured with environment variables.

- `XUNIT_REPORT_PATH` - path name where to put the xUnit report file, e.g. `./mocha_report.xml`


# Limitation
Currently to see the error stack trace in JSON report:
* add `--reporter json` into your `mocha.opts` file
* use Magellan version >=8.6.0
* Magellan option `--max_test_attempts` cannot be set to 1
