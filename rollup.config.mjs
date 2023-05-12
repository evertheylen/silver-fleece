import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
	input: 'src/index.ts',
	output: [
		{ file: 'silver-fleece.umd.js', format: 'umd', name: 'fleece' },
		{ file: 'silver-fleece.es.js', format: 'es' }
	],
	//name: 'fleece',
	plugins: [
		typescript({
			declaration: true,
			outDir: 'types',
		}),
		resolve()
	]
};
