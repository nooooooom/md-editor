/**
 * 此文件包含大量相互依赖的函数，为了保持代码的可读性和逻辑分组，
 * 我们允许函数在定义前使用（函数提升）
 */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable @typescript-eslint/no-unused-expressions */

import json5 from 'json5';
import type { RootContent } from 'mdast';
import { Element } from 'slate';

import { CustomLeaf, Elements, InlineKatexNode } from '../../el';
import { MarkdownEditorPlugin } from '../../plugin';
import { htmlToFragmentList } from '../plugins/insertParsedHtmlNodes';
import { EditorUtils } from '../utils';
import partialJsonParse from './json-parse';
import { handleCode, handleYaml } from './parse/parseCode';
import {
  parseTableOrChart,
  preprocessMarkdownTableNewlines,
} from './parse/parseTable';
import mdastParser from './remarkParse';

// 常量定义
const EMPTY_LINE_DISTANCE_THRESHOLD = 4; // 两个元素之间的行距阈值
const EMPTY_LINE_CALCULATION_OFFSET = 2; // 计算空行数量时的偏移量
const EMPTY_LINE_DIVISOR = 2; // 计算空行数量的除数
const INLINE_MATH_SUFFIX_PATTERN = '(?:%|[kKmMbB]|千|万|亿|兆|万亿|百万|亿万)?';
const INLINE_MATH_CURRENCY_PATTERN = new RegExp(
  `^[+-]?\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?${INLINE_MATH_SUFFIX_PATTERN}$`,
);
const INLINE_MATH_SIMPLE_NUMBER_PATTERN = new RegExp(
  `^[+-]?\\d+(?:\\.\\d+)?${INLINE_MATH_SUFFIX_PATTERN}$`,
);

const shouldTreatInlineMathAsText = (rawValue: string): boolean => {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return true;
  }
  if (/[=^_\\{}]/.test(trimmedValue)) {
    return false;
  }
  return (
    INLINE_MATH_CURRENCY_PATTERN.test(trimmedValue) ||
    INLINE_MATH_SIMPLE_NUMBER_PATTERN.test(trimmedValue)
  );
};

/**
 * 检测和解析 think 标签
 * @param str - 要检测的字符串
 * @returns think 标签的内容，如果不是 think 标签则返回 null
 */
const findThinkElement = (str: string) => {
  try {
    // 匹配 <think>内容</think> 格式
    const thinkMatch = str.match(/^\s*<think>([\s\S]*?)<\/think>\s*$/);
    if (thinkMatch) {
      return {
        content: thinkMatch[1].trim(),
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * 检测和解析 answer 标签
 * @param str - 要检测的字符串
 * @returns answer 标签的内容，如果不是 answer 标签则返回 null
 */
const findAnswerElement = (str: string) => {
  try {
    // 匹配 <answer>内容</answer> 格式
    const answerMatch = str.match(/^\s*<answer>([\s\S]*?)<\/answer>\s*$/);
    if (answerMatch) {
      return {
        content: answerMatch[1].trim(),
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * 从 HTML 字符串中提取媒体元素属性
 */
const extractMediaAttributes = (str: string) => {
  return {
    height: str.match(/height="(\d+)"/)?.[1],
    width: str.match(/width="(\d+)"/)?.[1],
    align: str.match(/data-align="(\w+)"/)?.[1],
    alt: str.match(/alt="([^"\n]+)"/)?.[1],
    controls: str.match(/controls/),
    autoplay: str.match(/autoplay/),
    loop: str.match(/loop/),
    muted: str.match(/muted/),
    poster: str.match(/poster="([^"\n]+)"/)?.[1],
  };
};

/**
 * 构建媒体元素对象
 */
const buildMediaElement = (
  url: string | undefined,
  tagName: string,
  attrs: ReturnType<typeof extractMediaAttributes>,
) => {
  return {
    url,
    height: attrs.height ? +attrs.height : undefined,
    width: attrs.width ? +attrs.width : undefined,
    align: attrs.align,
    alt: attrs.alt,
    tagName,
    controls: !!attrs.controls,
    autoplay: !!attrs.autoplay,
    loop: !!attrs.loop,
    muted: !!attrs.muted,
    poster: attrs.poster,
  };
};

/**
 * 从字符串中提取视频源 URL
 */
const extractVideoSource = (str: string, tagName: string | undefined) => {
  // 首先尝试从标签本身获取 src 属性
  let url = str.match(/src="([^"\n]+)"/);

  // 如果是 video 标签且没有找到 src，尝试从 source 标签中获取
  if (tagName === 'video' && !url) {
    const sourceMatch = str.match(/<source[^>]*src="([^"\n]+)"[^>]*>/);
    if (sourceMatch) {
      url = sourceMatch;
    }
  }

  return url?.[1];
};

/**
 * 查找并解析媒体元素（img/video/iframe）
 */
const findImageElement = (str: string) => {
  try {
    // 首先尝试匹配包含 source 标签的 video 格式
    const videoWithSourceMatch = str.match(
      /^\s*<video[^>\n]*>[\s\S]*?<source[^>]*src="([^"\n]+)"[^>]*>[\s\S]*?<\/video>\s*$/,
    );

    if (videoWithSourceMatch) {
      const attrs = extractMediaAttributes(str);
      return buildMediaElement(videoWithSourceMatch[1], 'video', attrs);
    }

    // 尝试匹配各种媒体标签格式
    const patterns = [
      /^\s*<(img|video|iframe)[^>\n]*>.*?<\/(?:img|video|iframe)>\s*$/, // 完整标签对
      /^\s*<(img|video|iframe)[^>\n]*\/?>(.*<\/(?:img|video|iframe)>)?\s*$/, // 完整标签
      /^\s*<(img|video|iframe)[^>\n]*\/>\s*$/, // 自闭合标签
      /^\s*<(img|video|iframe)[^>\n]*>\s*$/, // 仅开始标签
    ];

    for (const pattern of patterns) {
      const match = str.match(pattern);
      if (match) {
        const tagName = match[0].match(/<(img|video|iframe)/)?.[1];
        const url = extractVideoSource(match[0], tagName);
        const attrs = extractMediaAttributes(match[0]);
        return buildMediaElement(url, tagName!, attrs);
      }
    }

    return null;
  } catch (e) {
    console.error('Failed to parse media element:', e);
    return null;
  }
};

/**
 * 根据媒体元素信息创建编辑器节点
 */
const createMediaNodeFromElement = (
  mediaElement: ReturnType<typeof findImageElement>,
) => {
  if (!mediaElement) return null;

  // 根据标签类型确定媒体类型
  const mediaTypeMap: Record<string, string> = {
    video: 'video',
    iframe: 'iframe',
    img: 'image',
  };

  const mediaType = mediaTypeMap[mediaElement.tagName] || 'image';

  return EditorUtils.createMediaNode(
    decodeURIComponentUrl(mediaElement.url || ''),
    mediaType,
    {
      align: mediaElement.align,
      alt: mediaElement.alt,
      height: mediaElement.height,
      width: mediaElement.width,
      controls: mediaElement.controls,
      autoplay: mediaElement.autoplay,
      loop: mediaElement.loop,
      muted: mediaElement.muted,
      poster: mediaElement.poster,
    },
  );
};

const findAttachment = (str: string) => {
  try {
    const match = str.match(/^\s*<a[^>\n]*download[^>\n]*\/?>(.*<\/a>:?)?\s*$/);
    if (match) {
      const url = match[0].match(/href="([^"\n]+)"/);
      const size = match[0].match(/data-size="(\d+)"/);
      if (url) {
        return { url: url[1], size: Number(size?.[1] || 0) };
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

/**
 * 设置节点的 finished 属性
 */
const setFinishedProp = (leaf: CustomLeaf, finished: any): CustomLeaf => {
  if (finished === undefined) {
    return leaf;
  }

  return {
    ...leaf,
    otherProps: {
      ...leaf.otherProps,
      finished,
    },
  };
};

const parseText = (
  els: RootContent[],
  leaf: CustomLeaf = {
    data: {},
  },
) => {
  let leafs: CustomLeaf[] = [];
  for (let n of els) {
    if (n.type === 'strong') {
      const strongLeaf = setFinishedProp(
        { ...leaf, bold: true },
        (n as any).finished,
      );
      leafs = leafs.concat(parseText(n.children, strongLeaf));
      continue;
    }

    if (n.type === 'emphasis') {
      const emphasisLeaf = setFinishedProp(
        { ...leaf, italic: true },
        (n as any).finished,
      );
      leafs = leafs.concat(parseText(n.children, emphasisLeaf));
      continue;
    }

    if (n.type === 'delete') {
      leafs = leafs.concat(
        parseText(n.children, { ...leaf, strikethrough: true }),
      );
      continue;
    }

    if (n.type === 'link') {
      const linkLeaf = { ...leaf, url: n?.url };
      leafs = leafs.concat(parseText(n.children, linkLeaf));
      continue;
    }

    if (n.type === 'inlineCode') {
      leafs.push({ ...leaf, text: (n as any).value, code: true });
      continue;
    }

    if (n.type === 'inlineMath') {
      const inlineMathValue =
        typeof (n as any).value === 'string' ? (n as any).value : '';
      if (shouldTreatInlineMathAsText(inlineMathValue)) {
        leafs.push({ ...leaf, text: `$${inlineMathValue}$` });
      } else {
        leafs.push({
          ...leaf,
          type: 'inline-katex',
          children: [{ text: inlineMathValue }],
        } as any);
      }
      continue;
    }

    // @ts-ignore
    leafs.push({ ...leaf, text: (n as any).value || '' });
  }
  return leafs;
};

/**
 * 处理标题节点
 * @param currentElement - 当前处理的标题元素，包含depth和children属性
 * @returns 返回格式化的标题节点对象
 */
const handleHeading = (
  currentElement: any,
  plugins: MarkdownEditorPlugin[],
  parserConfig?: ParserMarkdownToSlateNodeConfig,
) => {
  return {
    type: 'head',
    level: currentElement.depth,
    children: currentElement.children?.length
      ? parseNodes(
          currentElement.children,
          plugins,
          false,
          currentElement,
          parserConfig,
        )
      : [{ text: '' }],
  };
};

export const decodeURIComponentUrl = (url: string) => {
  try {
    return decodeURIComponent(url);
  } catch (e) {
    console.error('Failed to decode URI component:', e);
    return url;
  }
};

/**
 * 解析 HTML 注释中的上下文属性
 */
const parseCommentContextProps = (
  value: string,
  processedValue: string,
): any => {
  const isComment =
    value &&
    processedValue?.trim()?.endsWith('-->') &&
    processedValue.trim()?.startsWith('<!--');

  if (!isComment) {
    return {};
  }

  try {
    return json5.parse(value);
  } catch (e) {
    try {
      return partialJsonParse(value);
    } catch (parseError) {
      console.warn('Failed to parse HTML comment as JSON or partial JSON:', {
        value,
        error: parseError,
      });
    }
    console.warn('HTML comment parse fallback attempted:', e);
  }
  return {};
};

/**
 * 处理块级 HTML 元素
 */
const handleBlockHtml = (
  currentElement: any,
  processedValue: string,
  isUnclosedComment: boolean,
): any => {
  const thinkElement = findThinkElement(currentElement.value);
  if (thinkElement) {
    return {
      type: 'code',
      language: 'think',
      value: thinkElement.content,
      children: [{ text: thinkElement.content }],
    };
  }

  const answerElement = findAnswerElement(currentElement.value);
  if (answerElement) {
    return { text: answerElement.content };
  }

  const mediaElement = findImageElement(currentElement.value);
  if (mediaElement) {
    return createMediaNodeFromElement(mediaElement);
  }

  if (currentElement.value === '<br/>') {
    return { type: 'paragraph', children: [{ text: '' }] };
  }

  if (currentElement.value.match(/^<\/(img|video|iframe)>/)) {
    return null;
  }

  const commentValue = isUnclosedComment
    ? processedValue
    : currentElement.value;
  const isComment =
    commentValue.trim().startsWith('<!--') &&
    commentValue.trim().endsWith('-->');

  if (isComment || isStandardHtmlElement(commentValue)) {
    return commentValue.match(/<\/?(table|div|ul|li|ol|p|strong)[^\n>]*?>/)
      ? htmlToFragmentList(commentValue, '')
      : {
          type: 'code',
          language: 'html',
          render: true,
          value: commentValue,
          children: [{ text: commentValue }],
        };
  }

  return { text: currentElement.value };
};

/**
 * 应用元素配置属性（纯函数版本）
 */
const applyElementConfig = (
  el: any,
  contextProps: any,
  processedValue: string,
  isUnclosedComment: boolean,
  currentElement: any,
): any => {
  if (!el || Array.isArray(el)) {
    return el;
  }

  const isPlainText = 'text' in el && Object.keys(el).length === 1;
  if (isPlainText) {
    return el;
  }

  const valueToCheck = isUnclosedComment
    ? processedValue
    : currentElement?.value;

  return {
    ...el,
    isConfig: valueToCheck?.trim()?.startsWith('<!--'),
    otherProps: {
      ...contextProps,
      finish: !isUnclosedComment,
    },
  };
};

/**
 * 处理HTML节点
 * @param currentElement - 当前处理的HTML元素
 * @param parent - 父级元素，用于判断上下文
 * @param htmlTag - HTML标签栈，用于跟踪嵌套的HTML标签
 * @returns 返回包含解析后元素和上下文属性的对象
 */
const handleHtml = (currentElement: any, parent: any, htmlTag: any[]) => {
  const trimmedValue = currentElement?.value?.trim() || '';
  const isUnclosedComment =
    trimmedValue.startsWith('<!--') && !trimmedValue.endsWith('-->');

  const processedValue = isUnclosedComment
    ? trimmedValue + '-->'
    : currentElement?.value || '';

  const value =
    processedValue?.replace('<!--', '').replace('-->', '').trim() || '{}';

  const contextProps = parseCommentContextProps(value, processedValue);

  const isBlockLevel =
    !parent || ['listItem', 'blockquote'].includes(parent.type);

  let el: any;
  let updatedHtmlTag = htmlTag;

  if (isBlockLevel) {
    el = handleBlockHtml(currentElement, processedValue, isUnclosedComment);
  } else {
    const inlineResult = processInlineHtml(currentElement, htmlTag);
    el = inlineResult.el;
    updatedHtmlTag = inlineResult.htmlTag;
  }

  const configuredEl = applyElementConfig(
    el,
    contextProps,
    processedValue,
    isUnclosedComment,
    currentElement,
  );

  return { el: configuredEl, contextProps, htmlTag: updatedHtmlTag };
};

/**
 * 处理内联HTML元素（纯函数版本）
 * @param currentElement - 当前处理的HTML元素
 * @param htmlTag - HTML标签栈
 * @returns 返回处理后的元素对象和新的标签栈，如果是标签则返回null
 */
const processInlineHtml = (
  currentElement: any,
  htmlTag: any[],
): { el: any; htmlTag: any[] } => {
  const value = currentElement.value;

  if (value.match(/<br\/?>/)) {
    return { el: { type: 'break', children: [{ text: '\n' }] }, htmlTag };
  }

  const answerElement = findAnswerElement(value);
  if (answerElement) {
    return { el: { text: answerElement.content }, htmlTag };
  }

  if (!isStandardHtmlElement(value)) {
    return { el: { text: value }, htmlTag };
  }

  const htmlMatch = value.match(
    /<\/?(b|i|del|font|code|span|sup|sub|strong|a)[^\n>]*?>/,
  );
  if (htmlMatch) {
    const [str, tag] = htmlMatch;
    const isClosingTag = str.startsWith('</');
    const isMatchingTag =
      isClosingTag && htmlTag.length && htmlTag[htmlTag.length - 1].tag === tag;

    let newHtmlTag = htmlTag;
    if (isMatchingTag) {
      newHtmlTag = htmlTag.slice(0, -1);
    }
    if (!isClosingTag) {
      newHtmlTag = processHtmlTag(str, tag, newHtmlTag);
    }
    return { el: null, htmlTag: newHtmlTag };
  }

  const mediaElement = findImageElement(value);
  return {
    el: mediaElement
      ? createMediaNodeFromElement(mediaElement)
      : { text: value },
    htmlTag,
  };
};

/**
 * 处理 span 标签的样式属性（纯函数版本）
 */
const processSpanTag = (str: string, tag: string, htmlTag: any[]): any[] => {
  try {
    const styles = str.match(/style="([^"\n]+)"/);
    if (!styles) {
      return htmlTag;
    }

    const stylesMap = new Map(
      styles[1]
        .split(';')
        .map((item: string) =>
          item.split(':').map((item: string) => item.trim()),
        ) as [string, string][],
    );

    const color = stylesMap.get('color');
    if (color) {
      return [...htmlTag, { tag, color }];
    }
  } catch (e) {
    console.warn('Failed to parse span style attribute:', { str, error: e });
  }
  return htmlTag;
};

/**
 * 处理 a 标签的链接属性（纯函数版本）
 */
const processATag = (str: string, tag: string, htmlTag: any[]): any[] => {
  const url = str.match(/href="([\w:./_\-#\\]+)"/);
  if (url) {
    return [...htmlTag, { tag, url: url[1] }];
  }
  return htmlTag;
};

/**
 * 处理 font 标签的颜色属性（纯函数版本）
 */
const processFontTag = (str: string, tag: string, htmlTag: any[]): any[] => {
  const colorMatch =
    str.match(/color="([^"\n]+)"/) || str.match(/color=([^"\n]+)/);
  if (colorMatch) {
    return [
      ...htmlTag,
      {
        tag,
        color: colorMatch[1].replaceAll('>', ''),
      },
    ];
  }
  return htmlTag;
};

/**
 * HTML 标签处理器映射表
 */
const htmlTagProcessors: Record<
  string,
  (str: string, tag: string, htmlTag: any[]) => any[]
> = {
  span: processSpanTag,
  a: processATag,
  font: processFontTag,
};

/**
 * 处理HTML标签并添加到标签栈中（纯函数版本）
 * @param str - HTML标签字符串
 * @param tag - 标签名称
 * @param htmlTag - HTML标签栈
 * @returns 返回新的标签栈数组
 */
const processHtmlTag = (str: string, tag: string, htmlTag: any[]): any[] => {
  const processor = htmlTagProcessors[tag];
  if (processor) {
    return processor(str, tag, htmlTag);
  }
  return [...htmlTag, { tag }];
};

/**
 * 处理图片节点
 * @param currentElement - 当前处理的图片元素，包含url和alt属性
 * @returns 返回格式化的图片节点对象
 */
const handleImage = (currentElement: any) => {
  return EditorUtils.createMediaNode(
    decodeURIComponent(currentElement?.url),
    'image',
    {
      alt: currentElement.alt,
      finished: currentElement.finished,
    },
  );
};

/**
 * 处理内联数学公式
 * @param currentElement - 当前处理的内联数学公式元素
 * @returns 返回格式化的内联KaTeX节点对象
 */
const handleInlineMath = (currentElement: any) => {
  const inlineMathValue =
    typeof currentElement?.value === 'string' ? currentElement.value : '';
  if (shouldTreatInlineMathAsText(inlineMathValue)) {
    return {
      type: 'paragraph',
      children: [{ text: `$${inlineMathValue}$` }],
    } as any;
  }
  return {
    type: 'inline-katex',
    children: [{ text: inlineMathValue }],
  } as InlineKatexNode;
};

/**
 * 处理数学公式块
 * @param currentElement - 当前处理的数学公式块元素
 * @returns 返回格式化的KaTeX块节点对象
 */
const handleMath = (currentElement: any) => {
  return {
    type: 'katex',
    language: 'latex',
    katex: true,
    value: currentElement.value,
    children: [{ text: '' }],
  };
};

/**
 * 处理列表节点
 * @param currentElement - 当前处理的列表元素，包含ordered、start等属性
 * @returns 返回格式化的列表节点对象
 */
const handleList = (
  currentElement: any,
  plugins: MarkdownEditorPlugin[],
  parserConfig?: ParserMarkdownToSlateNodeConfig,
) => {
  const el: any = {
    type: 'list',
    order: currentElement.ordered,
    start: currentElement.start,
    finished: currentElement.finished,
    children: parseNodes(
      currentElement.children,
      plugins,
      false,
      currentElement,
      parserConfig,
    ),
  };
  el.task = el.children?.some((s: any) => typeof s.checked === 'boolean');
  return el;
};

/**
 * 处理脚注引用
 * @param currentElement - 当前处理的脚注引用元素
 * @returns 返回格式化的脚注引用节点对象
 */
const handleFootnoteReference = (currentElement: any) => {
  return {
    text: `${currentElement.identifier?.toUpperCase()}`,
    identifier: currentElement.identifier,
    type: 'footnoteReference',
  };
};

/**
 * 处理脚注定义
 * @param currentElement - 当前处理的脚注定义元素
 * @returns 返回格式化的脚注定义节点对象
 */
const handleFootnoteDefinition = (
  currentElement: any,
  plugins: MarkdownEditorPlugin[],
  parserConfig?: ParserMarkdownToSlateNodeConfig,
) => {
  const linkNode = parseNodes(
    currentElement.children,
    plugins,
    false,
    currentElement,
    parserConfig,
  )?.at(0) as any;

  const cellNode = linkNode?.children?.at(0) as any;

  return {
    value: cellNode?.text,
    url: cellNode?.url,
    type: 'footnoteDefinition',
    identifier: currentElement.identifier,
    children: [cellNode],
  };
};

/**
 * 处理列表项节点（纯函数版本）
 * @param currentElement - 当前处理的列表项元素
 * @returns 返回格式化的列表项节点对象，包含复选框状态和提及信息
 */
const handleListItem = (
  currentElement: any,
  plugins: MarkdownEditorPlugin[],
  parserConfig?: ParserMarkdownToSlateNodeConfig,
) => {
  const children = currentElement.children?.length
    ? parseNodes(
        currentElement.children,
        plugins,
        false,
        currentElement,
        parserConfig,
      )
    : ([{ type: 'paragraph', children: [{ text: '' }] }] as any);

  let mentions = undefined;
  let processedChildren = [...children];

  if (
    currentElement.children?.[0]?.children?.[0]?.type === 'link' &&
    currentElement.children?.[0]?.children?.length > 1
  ) {
    const item = processedChildren?.[0]?.children?.[0] as any;
    const label = item?.text;
    if (label) {
      mentions = [
        {
          avatar: item?.url,
          name: label,
          id:
            new URLSearchParams('?' + item?.url?.split('?')[1]).get('id') ||
            undefined,
        },
      ];
      const firstChild = processedChildren[0];
      if (firstChild && firstChild.children) {
        processedChildren = [
          {
            ...firstChild,
            children: firstChild.children.filter(
              (_: any, idx: number) => idx !== 0,
            ),
          },
          ...processedChildren.slice(1),
        ];
      }
    }
  }

  if (
    processedChildren[0]?.type === 'paragraph' &&
    processedChildren[0]?.children?.[0]?.text
  ) {
    const text = processedChildren[0].children[0].text;
    const m = text.match(/^\[([x\s])]/);

    if (m) {
      const updatedFirstChild = {
        ...processedChildren[0],
        children: [
          {
            ...processedChildren[0].children[0],
            text: text.replace(/^\[([x\s])]/, ''),
          },
          ...processedChildren[0].children.slice(1),
        ],
      };
      return {
        type: 'list-item',
        checked: m ? m[1] === 'x' : undefined,
        children: [updatedFirstChild, ...processedChildren.slice(1)],
        mentions,
      };
    }
  }

  return {
    type: 'list-item',
    checked: currentElement.checked,
    children: processedChildren,
    mentions,
  };
};

/**
 * 处理附件链接
 */
const handleAttachmentLink = (currentElement: any) => {
  const text = currentElement.children
    .map((n: any) => (n as any).value || '')
    .join('');
  const attach = findAttachment(text);

  if (!attach) return null;

  const name = text.match(/>(.*)<\/a>/);
  return {
    type: 'attach',
    url: decodeURIComponentUrl(attach?.url),
    size: attach.size,
    children: [
      {
        type: 'card-before',
        children: [{ text: '' }],
      },
      {
        type: 'card-after',
        children: [{ text: '' }],
      },
    ],
    name: name ? name[1] : attach?.url,
  };
};

/**
 * 处理链接卡片
 */
const handleLinkCard = (currentElement: any, config: any) => {
  const link = currentElement?.children?.at(0) as {
    type: 'link';
    url: string;
    title: string;
  };

  return {
    ...config,
    type: 'link-card',
    url: decodeURIComponentUrl(link?.url),
    children: [
      {
        type: 'card-before',
        children: [{ text: '' }],
      },
      {
        type: 'card-after',
        children: [{ text: '' }],
      },
    ],
    name: link.title,
  };
};

/**
 * 处理段落中的图片子元素（纯函数版本）
 */
const processImageChild = (
  currentChild: any,
  textNodes: any[],
  elements: any[],
  currentElement: any,
  plugins: MarkdownEditorPlugin[],
  parserConfig?: ParserMarkdownToSlateNodeConfig,
): { elements: any[]; textNodes: any[] } => {
  let newElements = [...elements];
  let newTextNodes = [...textNodes];

  if (textNodes.length) {
    newElements.push({
      type: 'paragraph',
      children: parseNodes(
        textNodes,
        plugins,
        false,
        currentElement,
        parserConfig,
      ),
    });
    newTextNodes = [];
  }

  newElements.push(
    EditorUtils.createMediaNode(
      decodeURIComponentUrl(currentChild?.url),
      'image',
      {
        alt: currentChild.alt,
        finished: currentChild.finished,
      },
    ),
  );

  return { elements: newElements, textNodes: newTextNodes };
};

/**
 * 处理段落中的 HTML 子元素（纯函数版本）
 */
const processHtmlChild = (
  currentChild: any,
  textNodes: any[],
  elements: any[],
): { elements: any[]; textNodes: any[] } => {
  if (currentChild.value.match(/^<\/(img|video|iframe)>/)) {
    return { elements, textNodes };
  }

  const mediaElement = findImageElement(currentChild.value);
  if (mediaElement) {
    const node = createMediaNodeFromElement(mediaElement);
    if (node) {
      return { elements: [...elements, node], textNodes };
    }
  }

  return {
    elements,
    textNodes: [...textNodes, { type: 'html', value: currentChild.value }],
  };
};

/**
 * 处理段落中的子元素
 */
const processParagraphChildren = (
  currentElement: any,
  plugins: MarkdownEditorPlugin[],
  parserConfig?: ParserMarkdownToSlateNodeConfig,
) => {
  let elements: any[] = [];
  let textNodes: any[] = [];

  for (let currentChild of currentElement.children || []) {
    if (currentChild.type === 'image') {
      const result = processImageChild(
        currentChild,
        textNodes,
        elements,
        currentElement,
        plugins,
        parserConfig,
      );
      elements = result.elements;
      textNodes = result.textNodes;
    } else if (currentChild.type === 'html') {
      const result = processHtmlChild(currentChild, textNodes, elements);
      elements = result.elements;
      textNodes = result.textNodes;
    } else {
      textNodes = [...textNodes, currentChild];
    }
  }

  if (textNodes.length) {
    elements.push({
      type: 'paragraph',
      children: parseNodes(
        textNodes,
        plugins,
        false,
        currentElement,
        undefined,
      ),
    });
  }

  return elements;
};

/**
 * 处理段落节点
 * @param currentElement - 当前处理的段落元素
 * @param config - 配置对象，包含样式和行为设置
 * @param plugins - 插件数组
 * @returns 返回格式化的段落节点对象或元素数组
 */
const handleParagraph = (
  currentElement: any,
  config: any,
  plugins: MarkdownEditorPlugin[],
  parserConfig?: ParserMarkdownToSlateNodeConfig,
) => {
  // 检查是否是附件链接
  if (
    currentElement.children?.[0].type === 'html' &&
    currentElement.children[0].value.startsWith('<a')
  ) {
    const attachNode = handleAttachmentLink(currentElement);
    if (attachNode) return attachNode;
  }

  // 检查是否是链接卡片
  if (
    currentElement?.children?.at(0)?.type === 'link' &&
    config.type === 'card'
  ) {
    return handleLinkCard(currentElement, config);
  }

  // 处理混合内容段落
  return processParagraphChildren(currentElement, plugins, parserConfig);
};

/**
 * 处理内联代码节点
 * @param currentElement - 当前处理的内联代码元素
 * @returns 返回格式化的内联代码节点对象，支持占位符和初始值
 */
const handleInlineCode = (currentElement: any) => {
  const hasPlaceHolder = currentElement.value?.match(/\$\{(.*?)\}/);
  const values = hasPlaceHolder
    ? hasPlaceHolder[1]
        .split(';')
        .map((item: string) => {
          const values = item?.split(':');
          return {
            [values?.at(0) || '']: values?.at(1),
          };
        })
        .reduce((acc: any, item: any) => {
          return {
            ...acc,
            ...item,
          };
        }, {})
    : undefined;

  return {
    text: values ? values?.initialValue || ' ' : currentElement.value,
    tag: currentElement.value?.startsWith('${'),
    placeholder: values?.placeholder || undefined,
    initialValue: values?.initialValue || undefined,
    code: true,
  };
};

/**
 * 处理分割线节点
 * @returns 返回格式化的分割线节点对象
 */
const handleThematicBreak = () => {
  return { type: 'hr', children: [{ text: '' }] };
};

/**
 * 处理引用块节点
 * @param currentElement - 当前处理的引用块元素
 * @returns 返回格式化的引用块节点对象
 */
const handleBlockquote = (
  currentElement: any,
  plugins: MarkdownEditorPlugin[],
  parserConfig?: ParserMarkdownToSlateNodeConfig,
) => {
  return {
    type: 'blockquote',
    children: currentElement.children?.length
      ? parseNodes(
          currentElement.children,
          plugins,
          false,
          currentElement,
          parserConfig,
        )
      : [{ type: 'paragraph', children: [{ text: '' }] }],
  };
};

/**
 * 处理定义节点
 * @param currentElement - 当前处理的定义元素，包含标签和URL
 * @returns 返回格式化的定义段落节点对象
 */
const handleDefinition = (currentElement: any) => {
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

/**
 * 应用HTML标签样式到元素（纯函数版本）
 * @param el - 目标元素对象
 * @param htmlTag - HTML标签数组，包含样式信息
 * @returns 返回应用了样式的新元素对象
 */
const applyHtmlTagsToElement = (el: any, htmlTag: any[]): any => {
  if (!htmlTag.length) {
    return el;
  }

  const result = { ...el };

  for (let t of htmlTag) {
    if (t.tag === 'font') {
      result.color = t.color;
    }
    if (t.tag === 'sup') result.identifier = el.text;
    if (t.tag === 'sub') result.identifier = el.text;
    if (t.tag === 'code') result.code = true;
    if (t.tag === 'i') result.italic = true;
    if (t.tag === 'b' || t.tag === 'strong') result.bold = true;
    if (t.tag === 'del') result.strikethrough = true;
    if ((t.tag === 'span' || t.tag === 'font') && t.color) {
      result.highColor = t.color;
    }
    if (t.tag === 'a' && t?.url) {
      result.url = t?.url;
    }
  }

  return result;
};

/**
 * 处理文本和内联元素节点（纯函数版本）
 * @param currentElement - 当前处理的元素
 * @param htmlTag - HTML标签数组
 * @param applyInlineFormattingFn - 应用内联格式的函数
 * @param parseNodesFn - 解析节点的函数
 * @returns 处理后的元素对象
 */
const handleTextAndInlineElementsPure = (
  currentElement: any,
  htmlTag: any[],
  applyInlineFormattingFn: (leaf: CustomLeaf, element: any) => CustomLeaf,
  parseNodesFn: (children: any[], top: boolean, parent: any) => any[],
): any => {
  const elementType = currentElement.type;

  // 处理文本节点
  if (elementType === 'text') {
    const el = { text: currentElement.value };
    return htmlTag.length > 0 && currentElement.value
      ? applyHtmlTagsToElement(el, htmlTag)
      : el;
  }

  // 处理换行
  if (elementType === 'break') {
    return { text: '\n' };
  }

  // 处理内联元素（strong, link, emphasis, delete, inlineCode）
  const inlineElementTypes = [
    'strong',
    'link',
    'emphasis',
    'delete',
    'inlineCode',
  ];
  if (inlineElementTypes.includes(elementType)) {
    const leaf: CustomLeaf = {
      otherProps: {
        finished: (currentElement as any).finished,
      },
    };
    const formattedLeaf = applyInlineFormattingFn(leaf, currentElement);
    const leafWithHtmlTags = applyHtmlTagsToElement(formattedLeaf, htmlTag);

    const hasHtmlChildren = (currentElement as any)?.children?.some(
      (n: any) => n.type === 'html',
    );

    return hasHtmlChildren
      ? {
          ...parseNodesFn(
            (currentElement as any)?.children,
            false,
            currentElement,
          )?.at(0),
          url: leafWithHtmlTags.url,
        }
      : parseText(
          currentElement.children?.length
            ? currentElement.children
            : [{ value: leafWithHtmlTags?.url || '' }],
          leafWithHtmlTags,
        );
  }

  // 默认返回空文本
  return { text: '' };
};

/**
 * 应用上下文属性和配置到元素（纯函数版本）
 * @param el - 目标元素或元素数组
 * @param contextProps - 上下文属性对象
 * @param config - 配置对象
 * @returns 返回应用了属性和配置的新元素
 */
const applyContextPropsAndConfig = (
  el: any,
  contextProps: any,
  config: any,
) => {
  const hasContextProps = Object.keys(contextProps || {}).length > 0;
  const hasConfig = Object.keys(config || {}).length > 0;

  if (Array.isArray(el)) {
    return (el as Element[]).map((item) => {
      const result = { ...item };
      if (hasContextProps) {
        result.contextProps = contextProps;
      }
      if (hasConfig && !item.otherProps) {
        result.otherProps = config;
      }
      return result;
    }) as Element[];
  }

  const result = { ...el };
  if (hasContextProps) {
    result.contextProps = contextProps;
  }
  if (hasConfig && !el.otherProps) {
    result.otherProps = config;
  }
  return result;
};

/**
 * 根据行间距添加空行元素（纯函数版本）
 * @param els - 目标元素数组
 * @param preNode - 前一个节点
 * @param currentElement - 当前处理的元素
 * @param top - 是否为顶级解析
 * @returns 返回添加了空行元素的新数组
 */
const addEmptyLinesIfNeeded = (
  els: any[],
  preNode: any,
  currentElement: any,
  top: boolean,
): any[] => {
  if (!preNode || !top) {
    return els;
  }

  const distance =
    (currentElement.position?.start.line || 0) -
    (preNode.position?.end.line || 0);

  if (distance < EMPTY_LINE_DISTANCE_THRESHOLD) {
    return els;
  }

  const lines = Math.floor(
    (distance - EMPTY_LINE_CALCULATION_OFFSET) / EMPTY_LINE_DIVISOR,
  );

  const emptyLines = Array.from({ length: lines }, () => ({
    type: 'paragraph',
    children: [{ text: '' }],
  }));

  return [...els, ...emptyLines];
};

/**
 * 元素类型处理器映射表
 * 将元素类型映射到对应的处理函数
 * 注意：parserConfig 需要通过 handleSingleElement 传递，不在这里传递
 */
type ElementHandler = {
  handler: (
    element: any,
    plugins: MarkdownEditorPlugin[],
    config?: any,
    parent?: RootContent,
    htmlTag?: { tag: string; color?: string; url?: string }[],
    preElement?: Element | null,
  ) => Element | Element[] | null;
  needsHtmlResult?: boolean;
};

/**
 * 元素处理器映射表
 * 注意：这些处理器需要通过 handleSingleElement 传递 parserConfig
 */
const elementHandlers: Record<string, ElementHandler> = {
  heading: { handler: (el, plugins) => handleHeading(el, plugins) },
  html: { handler: () => null, needsHtmlResult: true },
  image: { handler: (el) => handleImage(el) },
  inlineMath: { handler: (el) => handleInlineMath(el) },
  math: { handler: (el) => handleMath(el) },
  list: { handler: (el, plugins) => handleList(el, plugins) },
  footnoteReference: { handler: (el) => handleFootnoteReference(el) },
  footnoteDefinition: {
    handler: (el, plugins) => handleFootnoteDefinition(el, plugins),
  },
  listItem: { handler: (el, plugins) => handleListItem(el, plugins) },
  paragraph: {
    handler: (el, plugins, config) => handleParagraph(el, config, plugins),
  },
  inlineCode: { handler: (el) => handleInlineCode(el) },
  thematicBreak: { handler: () => handleThematicBreak() },
  code: { handler: (el) => handleCode(el) },
  yaml: { handler: (el) => handleYaml(el) },
  blockquote: { handler: (el, plugins) => handleBlockquote(el, plugins) },
  table: {
    handler: (el, plugins, config, parent, htmlTag, preElement) =>
      parseTableOrChart(el, preElement, plugins, parseNodes, undefined),
  },
  definition: { handler: (el) => handleDefinition(el) },
};

/**
 * 解析 Markdown AST 节点为 Slate 节点（独立函数版本，用于向后兼容）
 * 内部使用 MarkdownToSlateParser 类来处理
 *
 * @deprecated 建议直接使用 MarkdownToSlateParser 类
 */
const parseNodes = (
  nodes: RootContent[],
  plugins: MarkdownEditorPlugin[],
  top = false,
  parent?: RootContent,
  parserConfig?: ParserMarkdownToSlateNodeConfig,
): (Elements | Text)[] => {
  // 创建一个临时 parser 实例来处理
  // 注意：这不是最优的方式，但为了向后兼容保留
  // 使用类型断言访问私有方法
  const parser = new MarkdownToSlateParser(parserConfig || {}, plugins || []);
  return (parser as any).parseNodes(nodes, top, parent);
};

/**
 * 标准 HTML 元素列表
 * 这些标签会被正常解析为 HTML，其他标签会被当作普通文本处理
 */
const STANDARD_HTML_ELEMENTS = new Set([
  // 文档结构
  'html',
  'head',
  'body',
  'title',
  'meta',
  'link',
  'style',
  'script',
  // 内容分区
  'header',
  'nav',
  'main',
  'section',
  'article',
  'aside',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  // 文本内容
  'div',
  'p',
  'hr',
  'pre',
  'blockquote',
  // 列表
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  // 表格
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'colgroup',
  'col',
  // 表单
  'form',
  'input',
  'textarea',
  'button',
  'select',
  'option',
  'label',
  'fieldset',
  'legend',
  // 内联文本语义
  'a',
  'em',
  'strong',
  'small',
  'mark',
  'del',
  'ins',
  'sub',
  'sup',
  'i',
  'b',
  'u',
  's',
  'code',
  'kbd',
  'samp',
  'var',
  'span',
  'br',
  'wbr',
  // 图片和多媒体
  'img',
  'video',
  'audio',
  'source',
  'track',
  'iframe',
  'embed',
  'object',
  'param',
  'picture',
  // 其他
  'canvas',
  'svg',
  'math',
  'details',
  'summary',
  'dialog',
  'menu',
  'menuitem',
  // 字体
  'font',
]);

/**
 * 检查 HTML 标签是否为标准元素
 * @param htmlString - HTML 字符串
 * @returns 是否为标准 HTML 元素
 */
function isStandardHtmlElement(htmlString: string): boolean {
  // 提取标签名（支持开始标签和结束标签）
  const tagMatch = htmlString.match(/<\/?(\w+)/);
  if (!tagMatch) return false;

  const tagName = tagMatch[1].toLowerCase();
  return STANDARD_HTML_ELEMENTS.has(tagName);
}

/**
 * 预处理特殊标签（think/answer），将其转换为代码块格式
 * @param markdown - 原始 Markdown 字符串
 * @param tagName - 标签名称（think 或 answer）
 * @returns 处理后的 Markdown 字符串
 */
function preprocessSpecialTags(
  markdown: string,
  tagName: 'think' | 'answer',
): string {
  const tagRegex = new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, 'g');

  return markdown?.replace(tagRegex, (match, content) => {
    const trimmedContent = content.trim();

    // 如果内容中包含代码块标记（三个反引号），需要进行转义
    // 策略：使用特殊标记替换代码块，保持原始格式
    const processedContent = trimmedContent?.replace(
      /```(\w*)\n?([\s\S]*?)```/g,
      (_: string, lang: string, code: string) => {
        // 使用特殊标记包裹，保留语言和代码内容
        // 格式：【CODE_BLOCK:lang】code【/CODE_BLOCK】
        const marker = '\u200B'; // 零宽空格，用于标记
        return `${marker}【CODE_BLOCK:${lang || ''}】\n${code}\n【/CODE_BLOCK】${marker}`;
      },
    );

    // 构建对应类型的代码块
    return `\`\`\`${tagName}\n${processedContent}\n\`\`\``;
  });
}

/**
 * 预处理 <think> 标签，将其转换为 ```think 代码块格式
 * @param markdown - 原始 Markdown 字符串
 * @returns 处理后的 Markdown 字符串
 */
function preprocessThinkTags(markdown: string): string {
  return preprocessSpecialTags(markdown, 'think');
}

/**
 * 预处理所有非标准 HTML 标签，提取其内容（删除标签本身）
 * @param markdown - 原始 Markdown 字符串
 * @returns 处理后的 Markdown 字符串
 */
function preprocessNonStandardHtmlTags(markdown: string): string {
  let result = markdown;
  let hasNonStandardTags = true;

  // 循环处理，直到没有非标准标签（处理嵌套情况）
  while (hasNonStandardTags) {
    const before = result;

    // 匹配所有 HTML 标签对：<tagname>content</tagname>
    result = result.replace(
      /<(\w+)>([\s\S]*?)<\/\1>/g,
      (match, tagName, content) => {
        // 检查是否为标准 HTML 元素
        if (STANDARD_HTML_ELEMENTS.has(tagName.toLowerCase())) {
          // 标准元素保持不变
          return match;
        }
        // 非标准元素只保留内容（不 trim，保持原始格式）
        return content;
      },
    );

    // 如果没有变化，说明处理完成
    hasNonStandardTags = before !== result;
  }

  return result;
}

/**
 * 解析Markdown字符串的配置选项
 */
export interface ParserMarkdownToSlateNodeConfig {
  /** 是否在新标签页打开链接 */
  openLinksInNewTab?: boolean;
  /** 自定义段落标签（在 Slate 中可能不适用，保留用于兼容性） */
  paragraphTag?: string;
  /** 是否正在输入中（打字机模式） */
  typing?: boolean;
}

/**
 * Markdown 到 Slate 节点解析器类
 *
 * 将 Markdown 字符串解析为 Slate 编辑器节点，支持配置选项和插件。
 * 使用类形式可以避免在函数调用链中传递配置参数和插件。
 */
export class MarkdownToSlateParser {
  private readonly config: ParserMarkdownToSlateNodeConfig;
  private readonly plugins: MarkdownEditorPlugin[];

  constructor(
    config: ParserMarkdownToSlateNodeConfig = {},
    plugins: MarkdownEditorPlugin[] = [],
  ) {
    this.config = config;
    this.plugins = plugins;
  }

  /**
   * 解析 Markdown 字符串并返回解析后的结构和链接信息
   *
   * @param md - 要解析的 Markdown 字符串
   * @returns 一个包含解析后的元素数组和链接信息的对象
   */
  parse(md: string): {
    schema: Elements[];
    links: { path: number[]; target: string }[];
  } {
    // 先预处理 <think> 标签，然后预处理其他非标准 HTML 标签，最后处理表格换行
    const thinkProcessed = preprocessThinkTags(md || '');
    const nonStandardProcessed = preprocessNonStandardHtmlTags(thinkProcessed);
    // parse() 只执行 parser，需要 runSync() 来执行 transformer 插件
    const ast = mdastParser.parse(
      preprocessMarkdownTableNewlines(nonStandardProcessed),
    ) as any;
    const processedMarkdown = mdastParser.runSync(ast) as any;

    const markdownRoot = processedMarkdown.children;

    // 使用类的配置和插件，通过 this 访问
    const schema = this.parseNodes(markdownRoot, true, undefined) as Elements[];

    console.log('markdownRoot', markdownRoot, schema);

    return {
      schema: schema?.filter((item) => {
        if (item.type === 'paragraph' && item.children?.length === 1) {
          if (item.children[0].text === '\n') {
            return false;
          }
          return true;
        }
        return true;
      }),
      links: [],
    };
  }

  /**
   * 解析 Markdown AST 节点为 Slate 节点（类方法版本）
   * - 当有插件时，优先使用插件处理
   * - 插件未处理时，使用默认处理逻辑
   */
  private parseNodes(
    nodes: RootContent[],
    top = false,
    parent?: RootContent,
  ): (Elements | Text)[] {
    if (!nodes?.length)
      return [{ type: 'paragraph', children: [{ text: '' }] }];

    let els: (Elements | Text)[] = [];
    let preNode: null | RootContent = null;
    let preElement: Element = null;
    let htmlTag: { tag: string; color?: string; url?: string }[] = [];
    let contextProps = {};

    for (let i = 0; i < nodes.length; i++) {
      const currentElement = nodes[i] as any;
      let el: Element | null | Element[] = null;
      let pluginHandled = false;

      const config =
        preElement?.type === 'code' &&
        preElement?.language === 'html' &&
        preElement?.otherProps
          ? preElement?.otherProps
          : {};

      // 首先尝试使用插件处理，使用 this.plugins
      for (const plugin of this.plugins) {
        const rule = plugin.parseMarkdown?.find((r) => r.match(currentElement));
        if (rule) {
          const converted = rule.convert(currentElement);
          // 检查转换结果是否为 NodeEntry<Text> 格式
          if (Array.isArray(converted) && converted.length === 2) {
            // NodeEntry<Text> 格式: [node, path]
            el = converted[0] as Element;
          } else {
            // Elements 格式
            el = converted as Element;
          }
          pluginHandled = true;
          break;
        }
      }

      // 如果插件没有处理，使用默认处理逻辑
      if (!pluginHandled) {
        const isLastNode = i === nodes.length - 1;

        // 如果是 code 节点，检查是否是最后一个节点，设置 finish 属性
        if (currentElement.type === 'code') {
          // 如果 code 不是最后一个节点，finish 设置为 true
          if (!isLastNode) {
            if (!(currentElement as any).otherProps) {
              (currentElement as any).otherProps = {};
            }
            (currentElement as any).otherProps.finish = true;
          }
          // 如果是最后一个节点，保持原逻辑（在 handleCode 中处理）
        }

        // 使用统一的处理函数，通过 this 访问配置和插件
        const result = this.handleSingleElement(
          currentElement,
          config,
          parent,
          htmlTag,
          preElement,
        );

        el = result.el;
        if (result.contextProps) {
          contextProps = { ...contextProps, ...result.contextProps };
        }
      }

      els = addEmptyLinesIfNeeded(els, preNode, currentElement, top);

      if (el) {
        el = applyContextPropsAndConfig(el, contextProps, config);
        els = Array.isArray(el) ? [...els, ...el] : [...els, el];
      }

      preNode = currentElement;
      preElement = el as Element;
    }

    return els;
  }

  /**
   * 处理单个元素（类方法版本）
   */
  private handleSingleElement(
    currentElement: RootContent,
    config: any,
    parent: RootContent | undefined,
    htmlTag: { tag: string; color?: string; url?: string }[],
    preElement: Element | null,
  ): { el: Element | Element[] | null; contextProps?: any } {
    const elementType = currentElement.type;
    const handlerInfo = elementHandlers[elementType];

    if (handlerInfo?.needsHtmlResult) {
      const htmlResult = handleHtml(currentElement, parent, htmlTag);
      return {
        el: htmlResult.el,
        contextProps: htmlResult.contextProps,
      };
    }

    if (!handlerInfo) {
      return {
        el: this.handleTextAndInlineElements(currentElement, htmlTag),
      };
    }

    const classMethodHandlers: Record<
      string,
      (element: any) => Element | Element[] | null
    > = {
      heading: (el) => this.handleHeading(el),
      list: (el) => this.handleList(el),
      listItem: (el) => this.handleListItem(el),
      blockquote: (el) => this.handleBlockquote(el),
      footnoteDefinition: (el) => this.handleFootnoteDefinition(el),
      paragraph: (el) => this.handleParagraph(el, config),
      table: (el) =>
        parseTableOrChart(
          el,
          preElement || (parent as any),
          this.plugins,
          (nodes, plugins, top, parentNode) =>
            this.parseNodes(nodes, top, parentNode),
          this.config,
        ),
    };

    const classMethodHandler = classMethodHandlers[elementType];
    if (classMethodHandler) {
      return { el: classMethodHandler(currentElement) };
    }

    const handlerResult = handlerInfo.handler(
      currentElement,
      this.plugins,
      config,
      parent,
      htmlTag,
      preElement,
    );

    return { el: handlerResult };
  }

  /**
   * 处理标题节点（类方法版本）
   */
  private handleHeading(currentElement: any) {
    return {
      type: 'head',
      level: currentElement.depth,
      children: currentElement.children?.length
        ? this.parseNodes(currentElement.children, false, currentElement)
        : [{ text: '' }],
    };
  }

  /**
   * 处理列表节点（类方法版本）
   */
  private handleList(currentElement: any) {
    const el: any = {
      type: 'list',
      order: currentElement.ordered,
      start: currentElement.start,
      finished: currentElement.finished,
      children: this.parseNodes(currentElement.children, false, currentElement),
    };
    el.task = el.children?.some((s: any) => typeof s.checked === 'boolean');
    return el;
  }

  /**
   * 处理脚注定义节点（类方法版本）
   */
  private handleFootnoteDefinition(currentElement: any) {
    const linkNode = this.parseNodes(
      currentElement.children,
      false,
      currentElement,
    )?.at(0) as any;

    const cellNode = linkNode?.children?.at(0) as any;

    return {
      value: cellNode?.text,
      url: cellNode?.url,
      type: 'footnoteDefinition',
      identifier: currentElement.identifier,
      children: [cellNode],
    };
  }

  /**
   * 处理列表项节点（类方法版本）
   */
  private handleListItem(currentElement: any) {
    const children = currentElement.children?.length
      ? this.parseNodes(currentElement.children, false, currentElement)
      : ([{ type: 'paragraph', children: [{ text: '' }] }] as any);

    let mentions = undefined;
    if (
      currentElement.children?.[0]?.children?.[0]?.type === 'link' &&
      currentElement.children?.[0]?.children?.length > 1
    ) {
      const item = children?.[0]?.children?.[0] as any;
      const label = item?.text;
      if (label) {
        mentions = [
          {
            avatar: item?.url,
            name: label,
            id:
              new URLSearchParams('?' + item?.url?.split('?')[1]).get('id') ||
              undefined,
          },
        ];
        delete children?.[0]?.children?.[0];
      }
    }

    return {
      type: 'list-item',
      checked: currentElement.checked,
      children,
      mentions,
    };
  }

  /**
   * 处理段落子节点（类方法版本）
   */
  private processParagraphChildren(currentElement: any) {
    const elements = [];
    let textNodes: any[] = [];

    for (let currentChild of currentElement.children || []) {
      if (currentChild.type === 'image') {
        // 将累积的文本节点生成段落
        if (textNodes.length) {
          elements.push({
            type: 'paragraph',
            children: this.parseNodes(textNodes, false, currentElement),
          });
          textNodes = [];
        }
        // 添加图片节点
        elements.push(
          EditorUtils.createMediaNode(
            decodeURIComponentUrl(currentChild?.url),
            'image',
            {
              alt: currentChild.alt,
              finished: currentChild.finished,
            },
          ),
        );
      } else if (currentChild.type === 'html') {
        // 跳过媒体标签的结束标签
        if (currentChild.value.match(/^<\/(img|video|iframe)>/)) {
          continue;
        }

        const mediaElement = findImageElement(currentChild.value);
        if (mediaElement) {
          const node = createMediaNodeFromElement(mediaElement);
          if (node) {
            elements.push(node);
          }
        } else {
          textNodes.push({ type: 'html', value: currentChild.value });
        }
      } else {
        textNodes.push(currentChild);
      }
    }

    // 处理剩余的文本节点
    if (textNodes.length) {
      elements.push({
        type: 'paragraph',
        children: this.parseNodes(textNodes, false, currentElement),
      });
    }

    return elements;
  }

  /**
   * 处理段落节点（类方法版本）
   */
  private handleParagraph(currentElement: any, config: any) {
    // 检查是否是附件链接
    if (
      currentElement.children?.[0].type === 'html' &&
      currentElement.children[0].value.startsWith('<a')
    ) {
      const attachNode = handleAttachmentLink(currentElement);
      if (attachNode) return attachNode;
    }

    // 检查是否是链接卡片
    if (
      currentElement?.children?.at(0)?.type === 'link' &&
      config.type === 'card'
    ) {
      return handleLinkCard(currentElement, config);
    }

    // 处理混合内容段落
    return this.processParagraphChildren(currentElement);
  }

  /**
   * 处理引用块节点（类方法版本）
   */
  private handleBlockquote(currentElement: any) {
    return {
      type: 'blockquote',
      children: currentElement.children?.length
        ? this.parseNodes(currentElement.children, false, currentElement)
        : [{ type: 'paragraph', children: [{ text: '' }] }],
    };
  }

  /**
   * 处理文本和内联元素节点（类方法版本）
   */
  private handleTextAndInlineElements(currentElement: any, htmlTag: any[]) {
    return handleTextAndInlineElementsPure(
      currentElement,
      htmlTag,
      (leaf, element) => this.applyInlineFormatting(leaf, element),
      (children, top, parent) => this.parseNodes(children, top, parent),
    );
  }

  /**
   * 应用内联格式到叶子节点（类方法版本）
   */
  private applyInlineFormatting(
    leaf: CustomLeaf,
    currentElement: any,
  ): CustomLeaf {
    const result: CustomLeaf = { ...leaf };
    const elementType = currentElement.type;
    const finished = (currentElement as any).finished;

    if (elementType === 'strong') {
      return setFinishedProp({ ...result, bold: true }, finished);
    }

    if (elementType === 'emphasis') {
      return setFinishedProp({ ...result, italic: true }, finished);
    }

    if (elementType === 'delete') {
      result.strikethrough = true;
      return result;
    }

    if (elementType === 'link') {
      try {
        result.url = currentElement?.url;
        const shouldOpenInNewTab =
          this.config?.openLinksInNewTab || finished === false;
        if (shouldOpenInNewTab) {
          if (!result.otherProps) {
            result.otherProps = {};
          }
          (result.otherProps as any).target = '_blank';
          (result.otherProps as any).rel = 'noopener noreferrer';
          (result.otherProps as any).finished = finished;
        }
      } catch {
        result.url = currentElement?.url;
      }
      return result;
    }

    return result;
  }
}

/**
 * 解析Markdown字符串并返回解析后的结构和链接信息。
 *
 * @param md - 要解析的Markdown字符串。
 * @param plugins - 可选的Markdown编辑器插件数组，用于扩展解析功能。
 * @param config - 可选的解析配置选项。
 * @returns 一个包含解析后的元素数组和链接信息的对象。
 *
 * @property schema - 解析后的元素数组。
 * @property links - 包含路径和目标链接的对象数组。
 *
 * @example
 * ```typescript
 * // 使用函数形式（向后兼容）
 * const result = parserMarkdownToSlateNode(markdown, plugins, { openLinksInNewTab: true });
 *
 * // 使用类形式（推荐，避免配置传递问题）
 * const parser = new MarkdownToSlateParser(
 *   { openLinksInNewTab: true },
 *   plugins
 * );
 * const result = parser.parse(markdown);
 * ```
 */
export const parserMarkdownToSlateNode = (
  md: string,
  plugins?: MarkdownEditorPlugin[],
  config?: ParserMarkdownToSlateNodeConfig,
): {
  schema: Elements[];
  links: { path: number[]; target: string }[];
} => {
  const parser = new MarkdownToSlateParser(config || {}, plugins || []);
  return parser.parse(md);
};
