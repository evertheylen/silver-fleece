import { locate } from 'locate-character';
import {
	ArrayExpression, Comment, Literal, ObjectExpression, ParserOptions, Property, Value
} from './interfaces';
import { number, whitespace } from './shared';

export function parse(str: string, opts?: ParserOptions) {
	const parser = new Parser(str, opts);
	return parser.value;
}

function noop(){}

class ParseError extends Error {
	pos: number;
	loc: {
		line: number;
		column: number;
	}

	constructor(message: string, pos: number, loc: { line: number, column: number }) {
		super(message);

		this.pos = pos;
		this.loc = loc;
	}
}

export default class Parser {
	str: string;
	index: number;
	value: Value;

	onComment: (comment: Comment) => void;
	onValue: (value: Value) => void;

	constructor(str: string, opts?: ParserOptions) {
		this.str = str;
		this.index = 0;

		this.onComment = (opts && opts.onComment) || noop;
		this.onValue = (opts && opts.onValue) || noop;

		this.value = this.readValue();
		this.readWhitespaceOrComment();

		if (this.index < this.str.length) {
			throw new Error(`Unexpected character '${this.peek()}'`)
		}
	}

	readWhitespaceOrComment() {
		while (
			this.index < this.str.length &&
			whitespace.test(this.str[this.index])
		) {
			this.index++;
		}

		const start = this.index;

		if (this.eat('/')) {
			if (this.eat('/')) {
				// line comment
				const text = this.readUntil(/(?:\r\n|\n|\r)/);

				this.onComment({
					start,
					end: this.index,
					type: 'Comment',
					text,
					block: false
				});

				this.eat('\n');
			} else if (this.eat('*')) {
				// block comment
				const text = this.readUntil(/\*\//);

				this.onComment({
					start,
					end: this.index,
					type: 'Comment',
					text,
					block: true
				});

				this.eat('*/', true);
			}
		} else {
			return;
		}

		this.readWhitespaceOrComment();
	}

	error(message: string, index = this.index) {
		const loc = locate(this.str, index, { offsetLine: 1 });
		// console.debug(`Error ${message}:`);
		// console.debug(`  string: ${this.str}`);
		// console.debug(`          ` + ' '.repeat(this.index) + `^-- here (${this.str[this.index]})`)
		// console.debug(`  around here `, this.str.slice(this.index-3, this.index+3));
		throw new ParseError(message, index, loc);
	}

	eat(str: string, required?: boolean) {
		if (this.str.slice(this.index, this.index + str.length) === str) {
			this.index += str.length;
			return str;
		}

		if (required) {
			this.error(`Expected '${str}' instead of '${this.str[this.index]}'`);
		}

		return null;
	}

	peek() {
		return this.str[this.index];
	}

	read(pattern: RegExp) {
		const match = pattern.exec(this.str.slice(this.index));
		if (!match || match.index !== 0) return null;

		this.index += match[0].length;

		return match[0];
	}

	readUntil(pattern: RegExp) {
		if (this.index >= this.str.length)
			this.error('Unexpected end of input');

		const start = this.index;
		const match = pattern.exec(this.str.slice(start));

		if (match) {
			const start = this.index;
			this.index = start + match.index;
			return this.str.slice(start, this.index);
		}

		this.index = this.str.length;
		return this.str.slice(start);
	}

	readArray(): ArrayExpression {
		const start = this.index;
		if (!this.eat('[')) return null;

		const array: ArrayExpression = {
			start,
			end: null,
			type: 'ArrayExpression',
			elements: []
		};

		this.readWhitespaceOrComment();

		while (this.peek() !== ']') {
			array.elements.push(this.readValue());
			this.readWhitespaceOrComment();

			if (!this.eat(',')) break;

			this.readWhitespaceOrComment();
		}

		if (!this.eat(']')) {
			this.error(`Expected ']' instead of '${this.str[this.index]}'`);
		}

		array.end = this.index;
		return array;
	}

	readBoolean(): Literal<boolean> {
		const start = this.index;

		const raw = this.read(/^(true|false)/);

		if (raw) {
			return {
				start,
				end: this.index,
				type: 'Literal',
				raw,
				value: raw === 'true'
			};
		}
	}

	readNull(): Literal<null> {
		const start = this.index;

		if (this.eat('null')) {
			return {
				start,
				end: this.index,
				type: 'Literal',
				raw: 'null',
				value: null
			};
		}
	}

	readLiteral(): Literal {
		return (
			this.readBoolean() ||
			this.readNumber() ||
			this.readString() ||
			this.readNull()
		);
	}

	readNumber(): Literal<number> {
		const start = this.index;

		const raw = this.read(number);

		if (raw) {
			return {
				start,
				end: this.index,
				type: 'Literal',
				raw,
				value: Number(raw)
			};
		}
	}

	readObject(): ObjectExpression {
		const start = this.index;

		if (!this.eat('{')) return;

		const object: ObjectExpression = {
			start,
			end: null,
			type: 'ObjectExpression',
			properties: []
		};

		this.readWhitespaceOrComment();

		while (this.peek() !== '}') {
			object.properties.push(this.readProperty());
			this.readWhitespaceOrComment();

			if (!this.eat(',')) break;

			this.readWhitespaceOrComment();
		}

		this.eat('}', true);

		object.end = this.index;
		return object;
	}

	readProperty(): Property {
		this.readWhitespaceOrComment();

		const property: Property = {
			start: this.index,
			end: null,
			type: 'Property',
			key: this.readPropertyKey(),
			value: this.readValue()
		};

		property.end = this.index;
		return property;
	}

	readPropertyKey(): Literal<string> {
		const key = this.readString();

		if (!key) this.error(`Bad identifier`);

		if (key.type === 'Literal') {
			key.name = String(key.value);
		}

		this.readWhitespaceOrComment();
		this.eat(':', true);

		return key;
	}

	readString(): Literal<string> {
		const start = this.index;

		const quote = this.eat('"');
		if (!quote) return;
		let end = this.str.indexOf('"', start+1);

		while (end > 0 && this.str[end-1] === '\\') {
			end = this.str.indexOf('"', end+1);
		}

		if (end === -1) this.error(`Unexpected end of input`);
		end++;
		this.index = end;
		const raw = this.str.slice(start, end);

		return {
			start,
			end,
			type: 'Literal',
			raw,
			value: JSON.parse(raw)
		};
	}

	readValue(): Value {
		this.readWhitespaceOrComment();

		const value = (
			this.readArray() ||
			this.readObject() ||
			this.readLiteral()
		);

		if (value) {
			this.onValue(value);
			return value;
		}

		// console.debug('string', this.str);
		// console.debug("at pos", ' '.repeat(this.index) + '^   ', this.str[this.index]);
		this.error(`Unexpected EOF`);
	}
}
