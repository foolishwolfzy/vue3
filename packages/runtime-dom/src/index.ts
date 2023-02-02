// 属性操作增删改（样式，类，事件，其他属性）
import { patchProp } from './patchOps';
import { extend } from "@vue/shared";
// 节点操作增删查改
import { nodeOps } from './nodeOps';
import { createRenderer } from '@vue/runtime-core';

// 渲染时用到的所有方法
const rendererOptions = extend({ patchProp }, nodeOps)
// runtime-core 提供渲染的核心方法，用runtime-dom中的api进行渲染
export function createApp(rootComponent, rootProps = null){
	const app = createRenderer(rendererOptions).createApp(rootComponent, rootProps)
	let {mount} = app
	app.mount = function (container) {
		container = nodeOps.querySelector(container)
		container.innerHTML = ''
		// 将组件渲染成dom元素 进行挂载
		mount(container) //函数劫持
	}
	return app
}

export * from '@vue/runtime-core'
// runtime-dom -> runtime-core
// runtime-dom 解决浏览器平台差异