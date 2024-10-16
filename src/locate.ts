// Taken from https://github.com/Rich-Harris/locate-character/blob/master/src/index.js
// Copyright (c) 2023 Rich Harris

export interface Options {
	offsetLine?: number;
	offsetColumn?: number;
	startIndex?: number;
}

export interface Range {
	start: number;
	end: number;
	line: number;
}

export interface Location {
	line: number;
	column: number;
	character: number;
}

function rangeContains(range: Range, index: number) {
	return range.start <= index && index < range.end;
}

export function getLocator(source: string, options: Options = {}) {
	const { offsetLine = 0, offsetColumn = 0 } = options;

	let start = 0;
	const ranges = source.split('\n').map((line, i) => {
		const end = start + line.length + 1;
		const range: Range = { start, end, line: i };
		start = end;
		return range;
	});

	let i = 0;

	function locator(search: string | number, index: number): Location | undefined {
		if (typeof search === 'string') {
			search = source.indexOf(search, index ?? 0);
		}

		if (search === -1) return undefined;

		let range = ranges[i];

		const d = search >= range.end ? 1 : -1;

		while (range) {
			if (rangeContains(range, search)) {
				return {
					line: offsetLine + range.line,
					column: offsetColumn + search - range.start,
					character: search
				};
			}

			i += d;
			range = ranges[i];
		}
	}

	return locator;
}

export function locate(source: string, search: string | number, options: Options): Location | undefined {
	return getLocator(source, options)(search, options && options.startIndex);
}
