/**
 * 处理内联代码节点
 * @param currentElement - 当前处理的内联代码元素
 * @returns 返回格式化的内联代码节点对象，支持占位符和初始值
 */
export const handleInlineCode = (currentElement: any) => {
  const hasPlaceHolder = currentElement.value?.match(/\$\{(.*?)\}/);
  let values: any = undefined;

  if (hasPlaceHolder) {
    values = hasPlaceHolder[1]
      .split(';')
      .map((item: string) => {
        const parts = item?.split(':');
        const key = parts?.at(0) || '';
        const value = parts?.at(1);
        // 只有当值存在时才设置，避免类型错误
        if (key && value !== undefined && value !== null) {
          return { [key]: value };
        }
        return {};
      })
      .reduce((acc: any, item: any) => {
        return {
          ...acc,
          ...item,
        };
      }, {});
  }

  const result: any = {
    tag: currentElement.value?.startsWith('${'),
    code: true,
  };

  // 优先使用 initialValue，其次使用 plaxceholder，最后使用原始值
  if (values?.initialValue) {
    result.text = values.initialValue || ' ';
  }
  if (!result.text && values?.placeholder) {
    // 当有 placeholder 时，text 设置为空格，避免空字符串导致 tag 被移除
    result.text = ' ';
  }
  if (!result.text) {
    // 只有当不是 ${ 开头的占位符时，才使用原始值
    if (!currentElement.value?.startsWith('${')) {
      result.text = currentElement.value;
    } else {
      // 如果是 ${ 开头但没有匹配到值，使用空格避免空字符串
      result.text = '';
    }
  }

  // 设置 placeholder 和 initialValue，如果不存在则设置为 undefined（符合测试快照期望）
  result.placeholder = values?.placeholder;
  result.initialValue = values?.initialValue;

  return result;
};

/**
 * 处理分割线节点
 * @returns 返回格式化的分割线节点对象
 */
export const handleThematicBreak = () => {
  return { type: 'hr', children: [{ text: '' }] };
};

/**
 * 处理定义节点
 * @param currentElement - 当前处理的定义元素，包含标签和URL
 * @returns 返回格式化的定义段落节点对象
 */
export const handleDefinition = (currentElement: any) => {
  return {
    type: 'paragraph',
    children: [
      {
        text:
          `[${currentElement.label}]: ` +
          (currentElement.url ? `${currentElement.url}` : ''),
      },
    ],
  };
};
