export interface Node {
	start: number;
	end: number;
	type: string;
}

export type Value = ObjectExpression | ArrayExpression | Literal;

export interface Property extends Node {
	type: 'Property';
	key: Literal<string>;
	value: Value;
}

export interface ObjectExpression extends Node {
	type: 'ObjectExpression';
	properties: Property[];
}

export interface ArrayExpression extends Node {
	type: 'ArrayExpression';
	elements: Value[];
}

type Primitive = string | number | boolean | null;
export interface Literal<T extends Primitive = Primitive> extends Node {
	type: 'Literal';
	raw: string;
	value: T;
	name?: string; // cheeky hack to allow object property code to always check `name`
}

export interface Comment extends Node {
	type: 'Comment';
	block: boolean;
	text: string;
}

export interface ParserOptions {
	onComment?: (comment: Comment) => void;
	onValue?: (value: Value) => void;
}

export interface StringifierOptions {
	spaces?: number;
	compact?: boolean;
}
