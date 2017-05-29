'use strict'

/* global describe it before */

var fs = require('fs')
var diff = require('diff')

var ajson = require('../annotated-json')

var tests = ['test/test.json']

describe('annotated-json Suite', function () {
  for (var i = 0; i < tests.length; ++i) {
    var test = tests[i]
    describe('test file - [' + test + ']', function () {
      var rawData
      before(function () {
        rawData = fs.readFileSync(test).toString()
      })

      it('parse->stringify re-generates exact input', function () {
        var tmp = ajson.stringify(ajson.parse(rawData))

        if (tmp !== rawData) {
          console.error(diff.createPatch(test, rawData, tmp))
          throw new Error('mismatch')
        }
      })
    })
  }
})
