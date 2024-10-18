import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
	input: 'src/index.ts',
	output: [
		{ file: 'dist/silver-fleece.umd.js', format: 'umd', name: 'fleece' },
		{ file: 'dist/silver-fleece.es.mjs', format: 'es' }
	],
	//name: 'fleece',
	plugins: [
		typescript({
			tsconfig: "./tsconfig.json"
		}),
		resolve()
	]
};
