import type { RootContent } from 'mdast';
import { Element } from 'slate';

import { Elements } from '../../el';
import { MarkdownEditorPlugin } from '../../plugin';
import { applyContextPropsAndConfig } from './parse/applyContextPropsAndConfig';
import {
  handleBlockquote,
  handleFootnoteDefinition,
  handleHeading,
  handleList,
  handleListItem,
  handleParagraph,
  handleTextAndInlineElements,
} from './parse/parseBlockElements';
import { handleCode, handleYaml } from './parse/parseCode';
import {
  handleDefinition,
  handleInlineCode,
  handleThematicBreak,
} from './parse/parseElements';
import { addEmptyLinesIfNeeded } from './parse/parseEmptyLines';
import { handleFootnoteReference } from './parse/parseFootnote';
import {
  handleHtml,
  preprocessNonStandardHtmlTags,
  preprocessThinkTags,
} from './parse/parseHtml';
import { handleInlineMath, handleMath } from './parse/parseMath';
import { handleImage } from './parse/parseMedia';
import {
  parseTableOrChart,
  preprocessMarkdownTableNewlines,
} from './parse/parseTable';
import mdastParser from './remarkParse';

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
 * 元素类型处理器映射表
 * 将元素类型映射到对应的处理函数
 * 注意：parserConfig 需要通过 handleSingleElement 传递，不在这里传递
 */
type ElementHandler = {
  handler: (
    element: any,
    _plugins: MarkdownEditorPlugin[],
    config?: any,
    parent?: RootContent,
    htmlTag?: { tag: string; color?: string; url?: string }[],
    preElement?: Element | null,
    _parser?: any,
  ) => Element | Element[] | null;
  needsHtmlResult?: boolean;
};

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

        // 如果是 code 节点，检查是否是最后一个节点，设置 finished 属性
        if (currentElement.type === 'code') {
          // 如果 code 不是最后一个节点，finish 设置为 true
          if (!isLastNode) {
            if (!(currentElement as any).otherProps) {
              (currentElement as any).otherProps = {};
            }
            delete (currentElement as any).otherProps.finished;
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
        // 更新 htmlTag 数组，以便后续节点可以使用
        if (result.htmlTag) {
          htmlTag = result.htmlTag;
        }
      }

      els = addEmptyLinesIfNeeded(els, preNode, currentElement, top);

      if (el) {
        el = applyContextPropsAndConfig(el, contextProps, config);
        // 使用 if-else 而不是条件表达式，避免类型错误
        if (Array.isArray(el)) {
          els = [...els, ...el];
        } else {
          els = [...els, el];
        }
      }

      preNode = currentElement;
      preElement = el as Element;
    }

    return els;
  }

  /**
   * 处理单个元素（类方法版本）
   */
  /**
   * 获取统一的元素处理器映射表
   */
  private getElementHandlers(): Record<string, ElementHandler> {
    const parseNodesFn = (nodes: any[], top: boolean, parent: any) =>
      this.parseNodes(nodes, top, parent);

    const parseNodesForTable = (
      nodes: RootContent[],
      _plugins: MarkdownEditorPlugin[],
      top?: boolean,
      parent?: RootContent,
    ) => this.parseNodes(nodes, top || false, parent);

    return {
      html: { handler: () => null, needsHtmlResult: true },
      image: { handler: (el) => handleImage(el) },
      inlineMath: { handler: (el) => handleInlineMath(el) },
      math: { handler: (el) => handleMath(el) },
      footnoteReference: { handler: (el) => handleFootnoteReference(el) },
      inlineCode: { handler: (el) => handleInlineCode(el) },
      thematicBreak: { handler: () => handleThematicBreak() },
      code: { handler: (el) => handleCode(el) },
      yaml: { handler: (el) => handleYaml(el) },
      definition: { handler: (el) => handleDefinition(el) },
      heading: {
        handler: (el) => handleHeading(el, parseNodesFn),
      },
      list: {
        handler: (el) => handleList(el, parseNodesFn),
      },
      listItem: {
        handler: (el) => handleListItem(el, parseNodesFn),
      },
      blockquote: {
        handler: (el) => handleBlockquote(el, parseNodesFn),
      },
      footnoteDefinition: {
        handler: (el) => handleFootnoteDefinition(el, parseNodesFn),
      },
      paragraph: {
        handler: (el, _plugins, config) =>
          handleParagraph(el, config, parseNodesFn),
      },
      table: {
        handler: (el, _plugins, _config, parent, _htmlTag, preElement) =>
          parseTableOrChart(
            el,
            preElement || (parent as any),
            this.plugins,
            parseNodesForTable,
            this.config,
          ),
      },
    };
  }

  private handleSingleElement(
    currentElement: RootContent,
    config: any,
    parent: RootContent | undefined,
    htmlTag: { tag: string; color?: string; url?: string }[],
    preElement: Element | null,
  ): { el: Element | Element[] | null; contextProps?: any; htmlTag?: any[] } {
    const elementType = currentElement.type;
    const elementHandlers = this.getElementHandlers();
    const handlerInfo = elementHandlers[elementType];

    if (handlerInfo?.needsHtmlResult) {
      const htmlResult = handleHtml(currentElement, parent, htmlTag);
      const result: any = {
        el: htmlResult.el,
      };
      if (htmlResult.contextProps) {
        result.contextProps = htmlResult.contextProps;
      }
      if (htmlResult.htmlTag) {
        result.htmlTag = htmlResult.htmlTag;
      }
      return result;
    }

    if (!handlerInfo) {
      return {
        el: handleTextAndInlineElements(
          currentElement,
          htmlTag,
          (nodes, top, parent) => this.parseNodes(nodes, top, parent),
          this.config,
        ),
      };
    }

    const handlerResult = handlerInfo.handler(
      currentElement,
      this.plugins,
      config,
      parent,
      htmlTag,
      preElement,
      this,
    );

    return { el: handlerResult };
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
