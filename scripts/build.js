// 把package目录下的所有包都进行打包
const fs = require('fs');
const execa = require('execa');
// const targets = fs.readdirSync('packages')
// console.log(targets)

const targets = fs.readdirSync('packages').filter(f =>{
	if(!fs.statSync(`packages/${f}`).isDirectory()){
		return false;
	}
	return true;
})

async function build(target){
	await execa('rollup',
	[
		'-c', 
		'--bundleConfigAsCjs',//加这个参数并把rollup.config.js后缀改为.cjs
		'--environment',
		`TARGET:${target}`
	],
	{
		stdio:'inherit'//子进程打包的信息共享给父进程
	}); 
}

function runParallel(targets,iteratorFn){
	const res = [];
	for(const item of targets){
		const p = iteratorFn(item)
		res.push(p)
	}
	return Promise.all(res)
}

runParallel(targets,build)
