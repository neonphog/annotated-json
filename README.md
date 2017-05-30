# annotated-json

Schema to support more human readable JSON config files, and parser / renderer for working with them in code.

This is NOT a json parser/stringifier, we use the native JSON functions internally.

```json
[
  "Ever wish you could use comments in JSON?",
  {"comments": "yes, please"},
  
  "",
  "Do you want a parser/renderer that can preserve those comments?",
  {"preserve": "yes, please"},
  
  "",
  "It needs to support hierarchical data too.",
  ["subObject", [
    {"subValue": "yay!"}
  ]]
]
```

When you parse the above, you will be given back more machine readable object tree:

```javascript
const ajson = require('annotated-json')
const parsed = ajson.parse(configFileData)
console.log(parsed)
```

```javascript
{
  annotations: { /* ... opaque annotations structure */ },
  json: {
    comments: 'yes, please',
    preserve: 'yes, please',
    subObject: {
      subValue: 'yay!'
    }
 }
 ```
 
 ## The Design
 
Annotated-JSON config files support comments by using root-level arrays and assigning special meaning to types:
- The root MUST be an array.
- A string is a comment.
  - An empty string is a renderer hint to put a newline above it.
- An array with exactly two elements defines a sub-block.
  - `[ <blockname>, [ <annotated json> ]]`
- An object with exactly one key specifies a name / value.
  - `{ <name>: <value> }`
- Anything else will error on parse.

## Api / Usage

### `parse`

```javascript
const ajson = require('annotated-json')
const parsed = ajson.parse('[{"key": "value"}]')
const parsed2 = ajson.parse([{key: 'value'}])
```

### `render`

```javascript
const ajson = require('annotated-json')
const rendered = ajson.render({annotations:{},json:{key: 'value'}})
```

### `stringify`

```javascript
const ajson = require('annotated-json')
const stringified = ajson.stringify([{key: 'value'}])
const stringified2 = ajson.stringify({annotations:{},json:{key: 'value'}})
```
