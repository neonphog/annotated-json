'use strict'

/* global describe it before */

var fs = require('fs')
var diff = require('diff')

var expect = require('chai').expect

var ajson = require('../annotated-json')

var tests = ['test/fixture/test.json']

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

        var debug = diff.createPatch(test, rawData, tmp)
        expect(tmp === rawData).equals(true, debug)
      })
    })
  }

  it('ensure raw json additions are included', function () {
    var arrayForm = ['comment', {key: 'value'}]
    var parsed = ajson.parse(arrayForm)
    parsed.json.key2 = 'value2'
    var rendered = ajson.render(parsed)
    var parsed2 = ajson.parse(rendered)
    expect(parsed2.json.key).equals('value')
    expect(parsed2.json.key2).equals('value2')
  })
})
