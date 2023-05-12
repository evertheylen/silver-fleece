# silver-fleece

Forked from [golden-fleece](https://github.com/Rich-Harris/golden-fleece) but adjusted and
simplified to parse normal JSON with comments. This makes it a bit faster, and the output will always
be parsable by standard JSON parsers (comments are only added if you add them).

## Why?

Patching files like `package.json` or `tsconfig.json`.

## Usage

Install it with `npm install silver-fleece` and import it into your app:

```js
import * as fleece from 'silver-fleece';
```

### fleece.parse(str, [options])

```js
const ast = fleece.parse(`true`);
// { start: 0, end: 4, type: 'Literal', raw: 'true', value: true }
```

The returned AST is [ESTree](https://github.com/estree/estree) compliant.

You can optionally pass callbacks that are fired whenever a value or comment is encountered:

```js
const ast = fleece.parse(str, {
	onComment: comment => {
		console.log('got a comment', comment);
	},
	onValue: value => {
		console.log('got a value', value);
	}
});
```


### fleece.evaluate(str)

```js
const { answer } = fleece.evaluate(`{ "answer": 42 }`);
answer === 42; // true
```


### fleece.patch(str, value)

This is where it gets fun:

```js
const str = `
	"number": 1,
	"string": "yes",
	"object": { "nested": true },
	"array": ["this", "that", "the other"]
`;

const object = fleece.evaluate(str);
object.number = 42;
object.array[2] = 'EVERYTHING';

fleece.patch(str, object) === `{
	"number": 42,
	"string": "yes",
	"object": { "nested": true },
	"array": ["this", "that", "EVERYTHING"]
}`; // true
```

Notice that the formatting has been preserved.


### fleece.stringify(value, [options])


```js
const object = {
	string: 'hello',
	'quoted-property': 2,
	array: [3, 4]
};

fleece.stringify(object) === `{
	"string": "hello",
	"quoted-property": 2,
	"array": [
		3,
		4
	]
}`; // true
```

To indent with spaces instead of tabs, pass `spaces: n`, where `n` is the number of spaces at each level of indentation.

```js
fleece.stringify(object, {
	spaces: 2
}) === `{
  "string": "hello",
  "quoted-property": 2,
  "array": [
    3,
    4
  ]
}`; // true
```

## License and copyright

Original golden-fleece code is owned and copyrighted by [Rich Harris and other contributors](https://github.com/Rich-Harris/golden-fleece/graphs/contributors).
They have released their contributions under the [LIL](LICENSE) license.

The silver-fleece changes are written by Evert Heylen and are also released under the same [LIL](LICENSE) license.
