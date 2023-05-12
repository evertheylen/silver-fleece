import { parse } from './parse';
import { Value, Property, ParserOptions } from './interfaces';

export function evaluate(str: string, opts?: ParserOptions) {
	const ast = parse(str, opts);
	return getValue(ast);
}

function getValue(node: Value): any {
	if (node.type === 'Literal') {
		return node.value;
	}

	if (node.type === 'ArrayExpression') {
		return node.elements.map(getValue);
	}

	if (node.type === 'ObjectExpression') {
		const obj: Record<string, any> = {};
		node.properties.forEach((prop: Property) => {
			obj[prop.key.name] = getValue(prop.value);
		});
		return obj;
	}
}
