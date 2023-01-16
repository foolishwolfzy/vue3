import path from 'path'
import json from '@rollup/plugin-json'// 支持引入json
import ts from 'rollup-plugin-typescript2' //rollup和ts的桥梁
import resolvePlugin from '@rollup/plugin-node-resolve' // 解析node第三方模块
console.log('___________________1', process.env.TARGET);

const packagesDir = path.resolve(__dirname,'packages')
console.log('___________________2', process.env.TARGET);
const packageDir = path.resolve(packagesDir,process.env.TARGET)
console.log('___________________3', packageDir);
const resolve = (p) => path.resolve(packageDir,p)
const pkg = require(resolve('package.json'))
const name = path.basename(packageDir) // 取文件名
const outputConfig = {
	'esm-bundler':{
		file:resolve(`dist/${name}.esm-bundler.js`),
		format:'es'
	},
	'cjs':{
		file:resolve(`dist/${name}.cjs.js`),
		format:'cjs'
	},
	'global':{
		file:resolve(`dist/${name}.global.js`),
		format:'iife'
	}
}

const options = pkg.buildOptions
console.log('options---===', options)

function createConfig(format,output){
	output.name = options.name
	output.sourcemap = true
	return {
		input:resolve(`src/index.ts`),
		output,
		plugins:[
			json(),
			ts({ //ts 插件
				tsconfig:path.resolve(__dirname,'tsconfig.json')
			}),
			resolvePlugin() //解析第三方模块
		]
	}

}
export default options.formats.map(format =>createConfig(format,outputConfig[format]))