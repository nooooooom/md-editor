import { BaseEditor, createEditor, Transforms } from 'slate';
import { HistoryEditor, withHistory } from 'slate-history';
import { ReactEditor, withReact } from 'slate-react';
import { beforeEach, describe, expect, it } from 'vitest';
import { parserSlateNodeToMarkdown } from '../../../utils';
import { withMarkdown } from '../../withMarkdown';
import { BackspaceKey } from '../backspace';

describe('BackspaceKey - Markdown 输出测试', () => {
  let editor: BaseEditor & ReactEditor & HistoryEditor;
  let backspaceKey: BackspaceKey;

  const createTestEditor = () => {
    const baseEditor = withMarkdown(withHistory(withReact(createEditor())));
    return baseEditor;
  };

  const getMarkdown = () => {
    return parserSlateNodeToMarkdown(editor.children);
  };

  beforeEach(() => {
    editor = createTestEditor();
    backspaceKey = new BackspaceKey(editor);
  });

  describe('删除空列表项', () => {
    it('应该删除最后一个空列表项并转换为段落', () => {
      // 设置初始内容：一个包含空列表项的列表
      editor.children = [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: '' }] }],
            },
          ],
        },
      ];

      // 选中空列表项的段落开头
      Transforms.select(editor, {
        anchor: { path: [0, 0, 0, 0], offset: 0 },
        focus: { path: [0, 0, 0, 0], offset: 0 },
      });
      // 执行 backspace
      const result = backspaceKey.run();

      expect(result).toBe(true);
      // 应该转换为空段落（删除列表和列表项）
      const markdown = getMarkdown();
      // 删除后应该是空段落，markdown 可能为空或只包含换行符
      const trimmedMarkdown = markdown.trim();

      // 允许为空字符串或只包含换行符
      expect(trimmedMarkdown === '' || trimmedMarkdown === '\n').toBe(true);
    });

    it('应该删除非最后一个空列表项及其后续列表项', () => {
      // 设置初始内容：包含多个列表项，中间一个是空的
      // 根据代码逻辑，删除非最后一个空列表项时，会删除当前 item 和之后的所有 items
      editor.children = [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: 'Item 1' }] }],
            },
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: '' }] }],
            },
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: 'Item 3' }] }],
            },
          ],
        },
      ];

      // 选中空列表项的段落开头
      Transforms.select(editor, {
        anchor: { path: [0, 1, 0, 0], offset: 0 },
        focus: { path: [0, 1, 0, 0], offset: 0 },
      });

      // 执行 backspace
      const result = backspaceKey.run();

      expect(result).toBe(true);
      // 应该删除空列表项及其后续列表项，只保留前面的列表项
      const markdown = getMarkdown();
      expect(markdown).toContain('Item 1');
      // Item 3 应该被删除（因为它是后续列表项）
      expect(markdown).not.toContain('Item 3');
    });

    it('不应该删除有内容的列表项', () => {
      // 设置初始内容：包含有内容的列表项
      editor.children = [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [{ type: 'paragraph', children: [{ text: 'Item 1' }] }],
            },
          ],
        },
      ];

      // 选中列表项段落开头
      Transforms.select(editor, {
        anchor: { path: [0, 0, 0, 0], offset: 0 },
        focus: { path: [0, 0, 0, 0], offset: 0 },
      });

      // 执行 backspace
      const result = backspaceKey.run();

      // 不应该删除有内容的列表项
      expect(result).toBe(false);
      const markdown = getMarkdown();
      expect(markdown).toContain('Item 1');
    });

    it('不应该删除包含嵌套列表的列表项（即使段落为空）', () => {
      // 设置初始内容：包含嵌套列表的列表项
      editor.children = [
        {
          type: 'bulleted-list',
          children: [
            {
              type: 'list-item',
              children: [
                { type: 'paragraph', children: [{ text: '' }] },
                {
                  type: 'bulleted-list',
                  children: [
                    {
                      type: 'list-item',
                      children: [
                        {
                          type: 'paragraph',
                          children: [{ text: 'Nested item' }],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ];

      // 选中列表项段落开头
      Transforms.select(editor, {
        anchor: { path: [0, 0, 0, 0], offset: 0 },
        focus: { path: [0, 0, 0, 0], offset: 0 },
      });

      // 执行 backspace
      const result = backspaceKey.run();

      // 不应该删除包含嵌套列表的列表项
      expect(result).toBe(false);
      const markdown = getMarkdown();
      expect(markdown).toContain('Nested item');
    });
  });
});
