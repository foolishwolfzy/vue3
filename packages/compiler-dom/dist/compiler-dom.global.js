var VueCompilerDOM = (function (exports) {
	'use strict';

	function isEnd(context) {
	    const source = context.source;
	    if (source.startsWith('</')) {
	        return true;
	    }
	    return !source;
	}
	function parseElement(context) { }
	function parseInterpolation(context) { }
	function getCursor(context) {
	    let { line, column, offset } = context;
	    return { line, column, offset };
	}
	function advancePositionWithMutation(context, s, endIndex) {
	    // 如何更新时第几行?
	    let linesCount = 0;
	    let linePos = -1;
	    for (let i = 0; i < endIndex; i++) {
	        if (s.charCodeAt(i) == 10) { // 遇到换行就涨一行
	            linesCount++;
	            linePos = i; // 换行后第一个人的位置 
	        }
	    }
	    context.offset += endIndex;
	    context.line += linesCount;
	    context.column = linePos == -1 ? context.column + endIndex : endIndex - linePos;
	    // 如何更新列数
	    // 更新偏移量
	}
	function advanceBy(context, endIndex) {
	    let s = context.source; // 原内容
	    // 计算出一个新的结束位置
	    advancePositionWithMutation(context, s, endIndex); // 根据内容和结束索引来修改上下文的信息
	    context.source = s.slice(endIndex); // 截取内容
	}
	function parseTextData(context, endIndex) {
	    const rawText = context.source.slice(0, endIndex);
	    advanceBy(context, endIndex); // 在context.source中把文本内容删除掉
	    return rawText;
	}
	function getSelection(context, start, end) {
	    end = end || getCursor(context);
	    return {
	        start,
	        end,
	        source: context.originalSource.slice(start.offset, end.offset)
	    };
	}
	function parseText(context) {
	    const endTokens = ['<', '{{'];
	    let endIndex = context.source.length; // 文本的整个长度
	    // 假设法 需要先假设 遇到 <  是结尾  在拿到遇到{{  去比较那个 在前 就是到哪
	    for (let i = 0; i < endTokens.length; i++) {
	        const index = context.source.indexOf(endTokens[i], 1);
	        if (index !== -1 && endIndex > index) {
	            endIndex = index;
	        }
	    }
	    // 有了文本的结束位置 我就可以更新行列信息 
	    let start = getCursor(context);
	    const content = parseTextData(context, endIndex);
	    return {
	        type: 2 /* NodeTypes.TEXT */,
	        content,
	        loc: getSelection(context, start)
	    };
	}
	function parseChildren(context) {
	    const nodes = [];
	    while (!isEnd(context)) {
	        const s = context.source; // 当前上下文中的内容  <  abc  {{}}
	        let node;
	        if (s[0] == '<') { // 标签
	            node = parseElement();
	        }
	        else if (s.startsWith('{{')) { // 表达式  
	            node = parseInterpolation();
	        }
	        else {
	            node = parseText(context);
	        }
	        nodes.push(node);
	    }
	    nodes.forEach((node, index) => {
	        if (node.type === 2 /* NodeTypes.TEXT */) {
	            if (!/[^ \t\r\n]/.test(node.content)) { // 只要没有内容，就删除掉
	                nodes[index] = null;
	            }
	            else {
	                node.content = node.content.replace(/[ \t\r\n]+/g, ' ');
	            }
	        }
	    });
	    return nodes.filter(Boolean); // 过滤null值
	}
	function createParserContext(content) {
	    return {
	        line: 1,
	        column: 1,
	        offset: 0,
	        source: content,
	        originalSource: content // 这个值是不会变的 记录你传入的内容
	    };
	}
	function createRoot(children, loc) {
	    return {
	        type: 0 /* NodeTypes.ROOT */,
	        children,
	        loc
	    };
	}
	function baseParse(content) {
	    // 标识节点的信息 行、列、偏移量...
	    // 我每解析一段 就移除一部分 
	    const context = createParserContext(content);
	    const start = getCursor(context); // 记录开始位置
	    return createRoot(parseChildren(context), getSelection(context, start));
	}
	function baseCompile(template) {
	    // 讲模板转换成ast语法树
	    const ast = baseParse(template);
	    return ast;
	}
	// 从 template - > ast语法树   (vue里面 有指令 有插槽 有事件)
	// ast - > transform -> codegen

	exports.baseCompile = baseCompile;

	return exports;

})({});
//# sourceMappingURL=compiler-dom.global.js.map
