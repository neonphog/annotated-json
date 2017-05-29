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
 */
function _subPathAppend (subPath, next) {
  var out = subPath.slice(0)
  out.push(next)
  return out
}

/**
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
 */
function _render (annotations, json) {
  var i, name, sub, obj

  var out = []

  if (annotations.sub) {
    for (i = 0; i < annotations.sub.length; ++i) {
      sub = annotations.sub[i]
      name = sub[0]
      sub = sub[1]

      if (Array.isArray(sub.pre) && sub.pre.length) {
        out = out.concat(sub.pre)
      }
      if (sub.value) {
        obj = {}
        obj[name] = json[name]
        out.push(obj)
      } else {
        out.push([name, _render(sub, json[name])])
      }
      if (Array.isArray(sub.post) && sub.post.length) {
        out = out.concat(sub.post)
      }
    }
  }

  return out
}

/**
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
