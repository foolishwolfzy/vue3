export const patchStyle = (el, prev, next) =>{
	const style = el.style //得到样式
	if(next == null){
		el.removeAttribute('style')
	}else{
		//老的里，先做删除，
		// 新的里，再赋值
		if(prev){
			for (let key in prev) {
				if(next[key] == null){ //老的里有，新的里没有，要删除
					style[key] = ''
				}
			}
		}
		//新的需要给style赋值上去
		for (let key in next) {
			style[key] = next[key]
		}
	}
}