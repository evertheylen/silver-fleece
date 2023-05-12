import * as assert from 'assert';
import * as fleece from '../src/index';
import {
	Comment, Value
} from '../src/interfaces';

describe('silver-fleece', () => {
	describe('parse', () => {
		const tests: Array<{
			solo?: boolean;
			skip?: boolean;
			input: string;
			output?: Value;
			comments?: Comment[];
			error?: RegExp;
		}> = [
			// booleans
			{
				input: `true`,
				output: {
					start: 0,
					end: 4,
					type: 'Literal',
					raw: 'true',
					value: true
				}
			},

			{
				input: `false`,
				output: {
					start: 0,
					end: 5,
					type: 'Literal',
					raw: 'false',
					value: false
				}
			},

			// numbers
			{
				input: `1`,
				output: {
					start: 0,
					end: 1,
					type: 'Literal',
					raw: '1',
					value: 1
				}
			},

			{
				input: `-1`,
				output: {
					start: 0,
					end: 2,
					type: 'Literal',
					raw: '-1',
					value: -1
				}
			},

			// strings
			{
				input: '"double-quotes"',
				output: {
					start: 0,
					end: 15,
					type: 'Literal',
					raw: '"double-quotes"',
					value: 'double-quotes'
				}
			},

			// objects
			{
				input: `{}`,
				output: {
					start: 0,
					end: 2,
					type: 'ObjectExpression',
					properties: []
				}
			},

			{
				input: `{ "foo": 1, "bar": 2 }`,
				output: {
					start: 0,
					end: 22,
					type: 'ObjectExpression',
					properties: [
						{
							start: 2,
							end: 10,
							type: 'Property',
							key: {
								start: 2,
								end: 7,
								type: 'Literal',
								raw: '"foo"',
								value: 'foo',
								name: 'foo'
							},
							value: {
								start: 9,
								end: 10,
								type: 'Literal',
								raw: '1',
								value: 1
							}
						},
						{
							start: 12,
							end: 20,
							type: 'Property',
							key: {
								start: 12,
								end: 17,
								type: 'Literal',
								raw: '"bar"',
								value: 'bar',
								name: 'bar'
							},
							value: {
								start: 19,
								end: 20,
								type: 'Literal',
								raw: '2',
								value: 2
							}
						}
					]
				}
			},

			{
				input: `{ "array": [ true ] }`,
				output: {
					start: 0,
					end: 21,
					type: 'ObjectExpression',
					properties: [{
						start: 2,
						end: 19,
						type: 'Property',
						key: {
							start: 2,
							end: 9,
							type: 'Literal',
							raw: '"array"',
							value: 'array',
							name: 'array'
						},
						value: {
							start: 11,
							end: 19,
							type: 'ArrayExpression',
							elements: [{
								start: 13,
								end: 17,
								type: 'Literal',
								value: true,
								raw: 'true'
							}]
						}
					}]
				}
			},

			// arrays
			{
				input: `[]`,
				output: {
					start: 0,
					end: 2,
					type: 'ArrayExpression',
					elements: []
				}
			},

			{
				input: `[true]`,
				output: {
					start: 0,
					end: 6,
					type: 'ArrayExpression',
					elements: [{
						start: 1,
						end: 5,
						type: 'Literal',
						value: true,
						raw: 'true'
					}]
				}
			},

			{
				input: `[true true]`,
				error: /Expected ']' instead of 't'/
			},

			// null
			{
				input: 'null',
				output: {
					start: 0,
					end: 4,
					type: 'Literal',
					raw: 'null',
					value: null
				}
			},

			// comments
			{
				input: '[ true, /*comment*/ false ]',
				output: {
					start: 0,
					end: 27,
					type: 'ArrayExpression',
					elements: [
						{
							start: 2,
							end: 6,
							type: 'Literal',
							raw: 'true',
							value: true
						},
						{
							start: 20,
							end: 25,
							type: 'Literal',
							raw: 'false',
							value: false
						}
					]
				},
				comments: [
					{
						start: 8,
						end: 19,
						type: 'Comment',
						block: false,
						text: 'comment'
					}
				]
			},

			{
				input: `"\\xzz"`,
				error: /Bad escaped character/
			},

			{
				input: `"\\uzzzz"`,
				error: /Bad Unicode escape/
			}
		];

		tests.forEach((test, i) => {
			const input = test.input.replace(/^\t{4}/gm, '');

			const padded = input.split('\n').map(line => `      ${line}`).join('\n');

			(test.solo ? it.only : test.skip ? it.skip : it)(`test ${i}\n${padded} `, () => {
				if (test.error) {
					assert.throws(() => {
						fleece.parse(input);
					}, test.error);
				} else {
					const parsed = fleece.parse(input);
					assert.deepEqual(parsed, test.output);
				}
			});
		});
	});

	describe('evaluate', () => {
		const tests: Array<{
			solo?: boolean;
			skip?: boolean;
			input: string;
			output?: any;
		}> = [
			{
				input: `true`,
				output: true
			},

			{
				input: `{ "foo": 1, "bar": 2 }`,
				output: { foo: 1, bar: 2 }
			},

			{
				input: `[1,]`,
				output: [1]
			},

			{
				input: `{ "foo": 1, }`,
				output: { foo: 1 }
			},

			{
				input: `{\n"foo": 123 //test \n}`,
				output: {foo: 123}
			},

			{
				input: `{
					"foo": "bar",
					"while": true,

					// this is an inline comment
					"here": "is another", // inline comment

					/* this is a block comment
					that continues on another line */

					"half": 0.5,

					"finally": "a trailing comma",
					"oh": [
						"we shouldn't forget",
						"arrays can have",
						"trailing commas too",
					],
				}`,
				output: {
					foo: 'bar',
					while: true,

					// this is an inline comment
					here: 'is another', // inline comment

					/* this is a block comment
					that continues on another line */

					half: .5,

					finally: 'a trailing comma',
					oh: [
						"we shouldn't forget",
						'arrays can have',
						'trailing commas too',
					],
				}
			},

			{
				input: `"\\n"`,
				output: `\n`
			},

			{
				input: `"a\\u0042c"`,
				output: 'aBc'
			}
		];

		tests.forEach((test, i) => {
			const input = test.input.replace(/^\t{4}/g, '');

			const padded = input.split('\n').map(line => `      ${line}`).join('\n');

			(test.solo ? it.only : test.skip ? it.skip : it)(`test ${i}\n${padded} `, () => {
				const value = fleece.evaluate(input)
				assert.deepEqual(value, test.output);
			});
		});
	});

	describe('patch', () => {
		const tests: Array<{
			solo?: boolean;
			skip?: boolean;
			input: string;
			value: any;
			output: string;
		}> = [
			{
				input: `  1  `,
				value: 42,
				output: `  42  `
			},

			{
				input: `-0.5`,
				value: -0.2,
				output: `-0.2`
			},

			{
				input: `0.5`,
				value: 10,
				output: '10'
			},

			{
				input: `-1`,
				value: -2,
				output: `-2`
			},

			{
				input: `  "x"  `,
				value: 'y',
				output: `  "y"  `
			},

			{
				input: '1',
				value: null,
				output: 'null'
			},

			{
				input: '1',
				value: 'x',
				output: `"x"`
			},

			{
				input: `"x"`,
				value: 1,
				output: `1`
			},

			{
				input: `[ true, /*comment*/ false ]`,
				value: [false, true],
				output: `[ false, /*comment*/ true ]`
			},

			{
				input: `[  ]`,
				value: [],
				output: `[  ]`
			},

			{
				input: `[ 1 ]`,
				value: [],
				output: `[]`
			},

			{
				input: `[]`,
				value: [1, 2, [3, 4]],
				output: `[
					1,
					2,
					[
						3,
						4
					]
				]`
			},

			{
				input: `[1, 2]`,
				value: [1, 2, 3],
				output: `[1, 2, 3]`
			},

			{
				input: `[ 1, 2 ]`,
				value: [1, 2, 3],
				output: `[ 1, 2, 3 ]`
			},

			{
				input: `[
					1, // a comment
					2
				]`,
				value: [1, 2, 3],
				output: `[
					1, // a comment
					2,
					3
				]`
			},

			{
				input: `[ 1, 2, 3 ]`,
				value: [1, 2],
				output: `[ 1, 2 ]`
			},

			{
				input: `[ 1, 2, null ]`,
				value: [1, 2, [3]],
				output: `[ 1, 2, [ 3 ] ]`
			},

			{
				input: `{  }`,
				value: {},
				output: `{  }`
			},

			{
				input: `{ "foo": 1 }`,
				value: {},
				output: `{}`
			},

			{
				input: `{ "foo": 1, "bar": 2 }`,
				value: { bar: 3, foo: 4 },
				output: `{ "foo": 4, "bar": 3 }`
			},

			{
				input: `{ "foo": 1, "bar": 2 }`,
				value: { bar: 3, baz: 4 },
				output: `{ "bar": 3, "baz": 4 }`
			},

			{
				input: `{ "foo": 1, "bar": 2 }`,
				value: { foo: 3 },
				output: `{ "foo": 3 }`
			},

			{
				input: `{ "foo": 1, "bar": 2, "baz": null }`,
				value: { foo: 1, bar: 2, baz: { qux: 3 } },
				output: `{ "foo": 1, "bar": 2, "baz": { "qux": 3 } }`
			},

			{
				input: `{
					"largeArray": [
						1,
						2,
						[ 3, 4 ]
					]
				}`,
				value: {
					largeArray: [5, 6, [7, 8]]
				},
				output: `{
					"largeArray": [
						5,
						6,
						[ 7, 8 ]
					]
				}`
			},

			{
				input: `{
					"foo": 1
				}`,
				value: {
					foo: 1,
					bar: {
						x: 0, y: 0
					}
				},
				output: `{
					"foo": 1,
					"bar": {
						"x": 0,
						"y": 0
					}
				}`
			},

			{
				input: `{"foo":"foo"}`,
				value: { bar: 'bar' },
				output: `{"bar": "bar"}`
			},

			{
				input: `{
					"foo": "foo"
				}`,
				value: { bar: 'bar' },
				output: `{
					"bar": "bar"
				}`
			}
		];

		tests.forEach((test, i) => {
			const input = test.input.replace(/^\t{4}/gm, '');
			const expected = test.output.replace(/^\t{4}/gm, '');

			const padded = input.split('\n').map(line => `      ${line}`).join('\n');

			(test.solo ? it.only : test.skip ? it.skip : it)(`test ${i}\n${padded} `, () => {
				const patched = fleece.patch(input, test.value);
				assert.equal(patched, expected);
			});
		});
	});

	describe('stringify', () => {
		const tests: Array<{
			solo?: boolean;
			skip?: boolean;
			input: any;
			output: string;
			spaces?: number;
			singleQuotes?: boolean
		}> = [
			{
				input: {
					foo: 1
				},
				output: `{
					"foo": 1
				}`
			},

			{
				input: '\n',
				output: `"\\n"`
			},

			{
				input: '"',
				output: `"\\""`
			},

			{
				input: "'",
				output: `"'"`
			},

			{
				input: `\\`,
				output: `"\\\\"`
			},

			{
				input: `\b`,
				output: `"\\b"`
			},

			{
				input: `\u2028`,
				output: `"\u2028"`
			}
		];

		tests.forEach((test, i) => {
			const expected = test.output.replace(/^\t{4}/gm, '');

			const padded = expected.split('\n').map(line => `      ${line}`).join('\n');

			(test.solo ? it.only : test.skip ? it.skip : it)(`test ${i}\n${padded} `, () => {
				const stringified = fleece.stringify(test.input, {
					spaces: test.spaces,
				});

				assert.equal(stringified, expected);
			});
		});

		it('should be cool with no options object passed in', () => {
			fleece.stringify('foo');
		})
	});
});
