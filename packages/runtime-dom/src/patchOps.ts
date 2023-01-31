import { patchEvent } from './modules/events';
import { patchClass } from "./modules/class";
import { patchStyle } from "./modules/style";
import { patchAttr } from './modules/attr';

export const patchProp = (el, key, prevValue, nextValue) => {
	switch (key) {
		case 'class':
			patchClass(el, nextValue)
			break;

		case 'style':
			patchStyle(el, prevValue, nextValue)
			break;
	
		default:
			if(/^on[^a-z]/.test(key)){
				patchEvent(el,key,nextValue)
			}else{
				patchAttr(el,key,nextValue)
			}
			break;
	}
}