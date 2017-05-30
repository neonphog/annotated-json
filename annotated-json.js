'use strict'

/*
 * Copyright 2017 David Braden (neonphog)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var os = require('os')

/**
 * Parse an annotated-json array file into a more machine usable object tree.
 * E.g. `[{"key": "value"}]` -> `{annotations:{},json:{"key": "value"}}`
 *
 * @param {string|array} data - input data
 * @return {object}
 *   return.json - `data` as object tree
 *   return.annotations - `data` annotations separated out
 */
exports.parse = function parse (data) {
  if (typeof data === 'string' || data instanceof Buffer) {
    data = JSON.parse(data.toString())
  }
  if (!Array.isArray(data)) {
    throw new Error('data root must be an array')
  }
  var out = {
    annotations: {pre: []},
    json: {}
  }
  _parse(out, data, [])
  return out
}

/**
 * Render a json object + annotations tree back into annotated-json array form.
 * @param {object} data
 * @param {object} data.annotations - annotations tree
 * @param {object} data.json - the raw json object to render
 * @return {array}
 */
exports.render = function render (data) {
  if (typeof data !== 'object' ||
      !('annotations' in data) ||
      !('json' in data)) {
    throw new Error('cannot render, this does not look like an annotated-json object')
  }
  return _render(data.annotations, data.json)
}

/**
 * Stringify a json object + annotations or annotated-json array.
 * String format differs slightly from a raw JSON.stringify mostly
 * in terms of line-break positioning for human readability.
 * @param {object|array} data
 * @return {string}
 */
exports.stringify = function stringify (data) {
  if (typeof data === 'object' &&
      'annotations' in data &&
      'json' in data) {
    data = exports.render(data)
  }
  if (!Array.isArray(data)) {
    throw new Error('data root must be an array')
  }
  return _stringify(data, 2, 0) + os.EOL
}

// -- private -- //

/**
 * Append an item to the subPath array without clobbering the original
 * @private
 * @param {array} subPath
 * @param {string} next
 * @return {array}
 */
function _subPathAppend (subPath, next) {
  var out = subPath.slice(0)
  out.push(next)
  return out
}

/**
 * Return json object based on subPath array
 * @private
 * @param {object} obj
 * @param {array} subPath
 * @return {object}
 */
function _jsonSubPath (obj, subPath) {
  var out = obj.json
  for (var i = 0; i < subPath.length; ++i) {
    if (!(subPath[i] in out)) {
      out[subPath[i]] = {}
    }
    out = out[subPath[i]]
  }
  return out
}

/**
 * Return annotation tree node based on subPath array
 * @private
 * @param {object} obj
 * @param {array} subPath
 * @return {object}
 */
function _annotationSubPath (obj, subPath) {
  var out = obj.annotations
  var sub
  for (var i = 0; i < subPath.length; ++i) {
    sub = null
    if (!out.sub) {
      out.sub = []
    }
    for (var j = 0; j < out.sub.length; ++j) {
      if (out.sub[j][0] === subPath[i]) {
        sub = out.sub[j]
        break
      }
    }
    if (!sub) {
      sub = [subPath[i], {pre: []}]
      out.sub.push(sub)
    }
    out = sub[1]
  }
  return out
}

/**
 * Workhorse recursive parse function. Converts array-form into object-form.
 * @private
 * @param {object} outObj - out param we are filling with data
 * @param {array} inData - in data node we are currently parsing
 * @param {array} subPath - tree location
 */
function _parse (outObj, inData, subPath) {
  var i, item, key, nextSubPath

  var comments = []
  var lastSubPath = null

  var checkPrepend = function checkPrepend (subPath) {
    if (comments.length) {
      _annotationSubPath(outObj, subPath).pre = comments
      comments = []
    }
  }

  for (i = 0; i < inData.length; ++i) {
    item = inData[i]
    if (typeof item === 'string') {
      comments.push(item)
    } else if (Array.isArray(item) && item.length === 2 &&
        Array.isArray(item[1]) && typeof item[0] === 'string') {
      nextSubPath = lastSubPath = _subPathAppend(subPath, item[0])
      checkPrepend(nextSubPath)
      _parse(outObj, item[1], nextSubPath)
    } else if (typeof item === 'object' && Object.keys(item).length === 1) {
      key = Object.keys(item)[0]
      nextSubPath = lastSubPath = _subPathAppend(subPath, key)
      checkPrepend(nextSubPath)
      _annotationSubPath(outObj, nextSubPath).value = true
      _jsonSubPath(outObj, subPath)[key] = item[key]
    } else {
      throw new Error('invalid annotated-json data')
    }
  }

  if (comments.length) {
    if (!lastSubPath) {
      lastSubPath = subPath
    }
    _annotationSubPath(outObj, lastSubPath).post = comments
    comments = []
  }
}

/**
 * Workhorse recursive render function. Converts object-form into array-form.
 * @private
 * @param {object} annotations
 * @param {object} json
 * @return {array} array-form annotated-json
 */
function _render (annotations, json) {
  var i, name, sub, obj, keys

  var foundKeys = {}
  var out = []

  if (annotations.sub) {
    for (i = 0; i < annotations.sub.length; ++i) {
      sub = annotations.sub[i]
      name = sub[0]
      sub = sub[1]
      foundKeys[name] = true

      if (Array.isArray(sub.pre) && sub.pre.length) {
        out = out.concat(sub.pre)
      }
      if (sub.value && name in json) {
        obj = {}
        obj[name] = json[name]
        out.push(obj)
      } else if (name in json) {
        out.push([name, _render(sub, json[name])])
      }
      if (Array.isArray(sub.post) && sub.post.length) {
        out = out.concat(sub.post)
      }
    }
  }

  // fill in any keys the user may have added directly
  keys = Object.keys(json)
  for (i = 0; i < keys.length; ++i) {
    name = keys[i]
    if (!(name in foundKeys)) {
      obj = {}
      obj[name] = json[name]
      out.push(obj)
    }
  }

  return out
}

/**
 * Workhorse recursive stringify function. Converts array-form into a string.
 * @private
 * @param {array} data
 * @param {number} indent - how many spaces to indent by
 * @param {number} depth - current recursive depth
 * @return {string}
 */
function _stringify (data, indent, depth) {
  var i, item, key

  var white = ''
  for (i = 0; i < indent * depth; ++i) {
    white += ' '
  }
  var white1 = white
  for (i = 0; i < indent; ++i) {
    white1 += ' '
  }

  var out = '[' + os.EOL

  for (i = 0; i < data.length; ++i) {
    item = data[i]
    if (i !== 0) {
      out += ',' + os.EOL
    }
    if (typeof item === 'string') {
      if (item.length === 0) {
        out += os.EOL
      }
      out += white1 + JSON.stringify(item)
    } else if (Array.isArray(item) && item.length === 2 &&
        Array.isArray(item[1]) && typeof item[0] === 'string') {
      out += white1 + '[' + JSON.stringify(item[0]) + ', '
      out += _stringify(item[1], indent, depth + 1)
      out += ']'
    } else if (typeof item === 'object' && Object.keys(item).length === 1) {
      key = Object.keys(item)[0]
      out += white1 + '{' + JSON.stringify(key) + ': '
      out += JSON.stringify(item[key], null, indent)
        .replace(/\n/g, '\n' + white1)
      out += '}'
    } else {
      throw new Error('invalid annotated-json data')
    }
  }

  out += os.EOL + white + ']'
  return out
}
