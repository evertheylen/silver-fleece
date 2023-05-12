import { spaces } from './shared';
import { StringifierOptions } from './interfaces';

export function stringify(value: any, options?: StringifierOptions) {
	const indentString = (options && options.spaces) ? spaces(options.spaces) : '\t';
	return stringifyValue(value, '\n', indentString, true);
}

export function stringifyProperty(
	key: string,
	value: any,
	indentation: string,
	indentString: string,
	newlines: boolean
): string {
	return (
		JSON.stringify(key) + ': ' + stringifyValue(value, indentation, indentString, newlines)
	);
}

export function stringifyValue(
	value: any,
	indentation: string,
	indentString: string,
	newlines: boolean
): string {
	const type = typeof value;

	if (type === 'boolean' || type === 'number' || type === 'string' || type === null) {
		return JSON.stringify(value);
	} else if (Array.isArray(value)) {
		const elements = value.map(element =>
			stringifyValue(
				element,
				indentation + indentString,
				indentString,
				true
			)
		);

		if (newlines) {
			return (
				`[\n${indentation + indentString}` +
				elements.join(`,\n${indentation + indentString}`) +
				`\n${indentation}]`
			);
		}

		return `[ ${elements.join(', ')} ]`;
	} else if (type === 'object') {
		const keys = Object.keys(value);
		const properties = keys.map(key => 
			stringifyProperty(
				key,
				value[key],
				indentation + indentString,
				indentString,
				newlines
			)
		);

		if (newlines) {
			return (
				`{${indentation + indentString}` +
				properties.join(`,${indentation + indentString}`) +
				`${indentation}}`
			);
		}

		return `{ ${properties.join(', ')} }`;
	}

	throw new Error(`Cannot stringify ${type}`);
}
