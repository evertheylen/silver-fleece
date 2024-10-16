import { parse } from './parse';
import { stringifyProperty, stringifyValue } from './stringify';
import { whitespace } from './shared';
import {
	Value,
	Property,
	ArrayExpression,
	ObjectExpression,
	Literal,
	Comment
} from './interfaces';

export function patch(str: string, value: any) {
	const indentString: string = guessIndentString(str);

	const comments: Comment[] = [];
	const root: Value = parse(str);

	const newlines = (
		/\n/.test(str.slice(root.start, root.end)) ||
		root.type === 'ArrayExpression' && root.elements.length === 0 ||
		root.type === 'ObjectExpression' && root.properties.length === 0
	);

	return (
		str.slice(0, root.start) +
		patchValue(root, value, str, '\n', indentString, newlines) +
		str.slice(root.end)
	);
}

function patchValue(
	node: Value,
	value: any,
	str: string,
	indentation: string,
	indentString: string,
	newlines: boolean
): string {
	const type = typeof value;

	if (type === 'string') {
		return JSON.stringify(value);
	}

	if (type === 'number') {
		return patchNumber((<Literal>node).raw, value);
	}

	if (type === 'boolean' || value === null) {
		return String(value);
	}

	if (Array.isArray(value)) {
		if (node.type === 'ArrayExpression') {
			return patchArray(
				<ArrayExpression>node,
				value,
				str,
				indentation,
				indentString,
				newlines
			);
		}

		return stringifyValue(value, indentation, indentString, newlines);
	}

	if (type === 'object') {
		if (node.type === 'ObjectExpression') {
			return patchObject(
				<ObjectExpression>node,
				value,
				str,
				indentation,
				indentString,
				newlines
			);
		}

		return stringifyValue(value, indentation, indentString, newlines);
	}

	throw new Error(`Cannot stringify ${type}s`);
}

function patchNumber(raw: string, value: number) {
	return String(value);
}

function patchArray(
	node: ArrayExpression,
	value: any,
	str: string,
	indentation: string,
	indentString: string,
	newlines: boolean
): string {
	if (value.length === 0) {
		return node.elements.length === 0 ? str.slice(node.start, node.end) : '[]';
	}

	const precedingWhitespace = getPrecedingWhitespace(str, node.start);
	const empty = precedingWhitespace === '';
	const newline = empty || /\n/.test(precedingWhitespace);

	if (node.elements.length === 0) {
		return stringifyValue(value, indentation, indentString, newline);
	}

	let i = 0;
	let c = node.start;
	let patched = '';
	const newlinesInsideValue =
		str.slice(node.start, node.end).split('\n').length > 1;

	for (; i < value.length; i += 1) {
		const element = node.elements[i];

		if (element) {
			patched +=
				str.slice(c, element.start) +
				patchValue(element, value[i], str, indentation, indentString, newlinesInsideValue);

			c = element.end;
		} else {
			// append new element
			if (newlinesInsideValue) {
				patched +=
					`,${indentation + indentString}` +
					stringifyValue(value[i], indentation, indentString, true);
			} else {
				patched +=
					`, ` +
					stringifyValue(value[i], indentation, indentString, false);
			}
		}
	}

	if (i < node.elements.length) {
		c = node.elements[node.elements.length - 1].end;
	}

	patched += str.slice(c, node.end);
	return patched;
}

function patchObject(
	node: ObjectExpression,
	value: any,
	str: string,
	indentation: string,
	indentString: string,
	newlines: boolean
): string {
	const keys = Object.keys(value);

	if (keys.length === 0) {
		return node.properties.length === 0
			? str.slice(node.start, node.end)
			: '{}';
	}

	const existingProperties: Record<string, Property> = {};
	node.properties.forEach(prop => {
		existingProperties[prop.key.name] = prop;
	});

	const precedingWhitespace = getPrecedingWhitespace(str, node.start);
	const empty = precedingWhitespace === '';
	const newline = empty || /\n/.test(precedingWhitespace);

	if (node.properties.length === 0) {
		return stringifyValue(value, indentation, indentString, newline);
	}

	let i = 0;
	let c = node.start;
	let patched = '';
	const newlinesInsideValue = /\n/.test(str.slice(node.start, node.end));

	let started = false;
	const intro = str.slice(node.start, node.properties[0].start);

	for (; i < node.properties.length; i += 1) {
		const property = node.properties[i];
		const propertyValue = value[property.key.name];

		indentation = getIndentation(str, property.start);

		if (propertyValue !== undefined) {
			patched += started
				? str.slice(c, property.value.start)
				: intro + str.slice(property.key.start, property.value.start);

			patched += patchValue(
				property.value,
				propertyValue,
				str,
				indentation,
				indentString,
				newlinesInsideValue
			);

			started = true;
		}

		c = property.end;
	}

	// append new properties
	keys.forEach(key => {
		if (key in existingProperties) return;

		const propertyValue = value[key];

		patched +=
			(started ? ',' + (newlinesInsideValue ? indentation : ' ') : intro) +
			stringifyProperty(
				key,
				propertyValue,
				indentation,
				indentString,
				newlinesInsideValue
			);
		started = true;
	});

	patched += str.slice(c, node.end);
	return patched;
}

function getIndentation(str: string, i: number) {
	while (i > 0 && !whitespace.test(str[i - 1])) i -= 1;
	const end = i;

	while (i > 0 && whitespace.test(str[i - 1])) i -= 1;
	return str.slice(i, end);
}

function getPrecedingWhitespace(str: string, i: number) {
	const end = i;

	while (i > 0 && whitespace.test(str[i])) i -= 1;
	return str.slice(i, end);
}

function guessIndentString(str: string) {
	const lines = str.split('\n');

	let tabs = 0;
	let spaces = 0;
	let minSpaces = 8;

	lines.forEach(line => {
		const match = /^(?: +|\t+)/.exec(line);
		if (!match) return;

		const whitespace = match[0];
		if (whitespace.length === line.length) return;

		if (whitespace[0] === '\t') {
			tabs += 1;
		} else {
			spaces += 1;
			if (whitespace.length > 1 && whitespace.length < minSpaces) {
				minSpaces = whitespace.length;
			}
		}
	});

	if (spaces > tabs) {
		let result = '';
		while (minSpaces--) result += ' ';
		return result;
	} else {
		return '\t';
	}
}
