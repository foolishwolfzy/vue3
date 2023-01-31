export function createAppAPI(render){
	return function createApp(rootComponent,rootProps){
		const app = {
			mount(container){
				// console.log(container,rootComponent,rootProps,rendererOptions)
				let vnode = {}
				render(vnode, container)
			}
		}
		return app
	}
}