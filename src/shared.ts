export const whitespace = /\s/;
export const number = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/

export function spaces(n: number) {
	let result = '';
	while (n--) result += ' ';
	return result;
}
