import { createVNode } from "./vnode"

export function createAppAPI(render){
	return function createApp(rootComponent,rootProps){
		const app = {
			_component:rootComponent,
			_props:rootProps,
			_container:null,
			mount(container){
				// console.log(container,rootComponent,rootProps,rendererOptions)
				const vnode = createVNode(rootComponent,rootProps)

				render(vnode, container)

				app._container = container
			}
		}
		return app
	}
}