export const nodeOps = {
	// 一些dom操作
	createElement: tagName => document.createElement(tagName),
	remove: child => {
		const parent = child.parentNode;
		if(parent){
			parent.removeChild(child);
		}
	},
	insert:(child, parent, anchor = null) => {
		parent.insertBefore(child, anchor); //anchor 为空时相当于appendChild
	},
	querySelector: selector => document.querySelector(selector),
	setElementText: (el, text) => el.textContent = text,
	createText: text => document.createTextNode(text),
	setText:(node, text) => node.nodeValue = text
}