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

- `JSON_REPORT_PATH` - path name where to put the JSON report file, e.g. `./mocha_report.xml`
