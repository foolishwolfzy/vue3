import { createAppAPI } from "./apiCreateApp";

// 创建一个渲染器
export function createRenderer(rendererOptions){
	const render = (vnode, container) => {}
	return {
		createApp:createAppAPI(render)
	}
}