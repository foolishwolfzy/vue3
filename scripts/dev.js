// 只针对具体某个包大包
// yarn add typescript rollup rollup-plugin-typescript2 @rollup/plugin-node-resolve @rollup/plugin-json execa --ignore-workspace-root-check
const fs = require('fs');
const execa = require('execa');

// const target = 'reactivity'
const target = 'runtime-dom'
build(target)
async function build(target){
	await execa('rollup',
	[
		'-cw', 
		'--bundleConfigAsCjs',//加这个参数并把rollup.config.js后缀改为.cjs
		'--environment',
		`TARGET:${target}`
	],
	{
		stdio:'inherit'//子进程打包的信息共享给父进程
	}); 
}
