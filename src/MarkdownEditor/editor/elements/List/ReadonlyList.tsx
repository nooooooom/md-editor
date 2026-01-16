import { ConfigProvider } from 'antd';
import classNames from 'classnames';
import React, { createElement, useContext } from 'react';
import { debugInfo } from '../../../../Utils/debugUtils';
import { ElementProps, ListNode } from '../../../el';
import { useStyle } from './style';

/**
 * ReadonlyList 组件 - 只读列表预览组件
 *
 * 专门针对 readonly 模式优化的列表组件，移除了拖拽功能等编辑相关功能。
 * 简化渲染逻辑，提升预览模式性能。
 *
 * @component
 * @description 只读列表预览组件，用于预览模式下的列表渲染
 * @param {ElementProps<ListNode>} props - 组件属性
 * @param {ListNode} props.element - 列表节点元素
 * @param {React.ReactNode} props.children - 子组件内容
 * @param {Object} props.attributes - 元素属性
 *
 * @example
 * ```tsx
 * <ReadonlyList
 *   element={listNode}
 *   attributes={attributes}
 * >
 *   列表项内容
 * </ReadonlyList>
 * ```
 *
 * @returns {React.ReactElement} 渲染的只读列表组件
 *
 * @remarks
 * - 移除拖拽相关事件处理
 * - 使用 React.memo 优化性能
 * - 保持预览模式的视觉效果
 */
export const ReadonlyList: React.FC<ElementProps<ListNode>> = React.memo(
  ({ element, attributes, children }) => {
    debugInfo('ReadonlyList - 渲染只读列表', {
      order: element.order,
      task: element.task,
      start: element.start,
      childrenCount: element.children?.length,
    });

    const context = useContext(ConfigProvider.ConfigContext);
    const baseCls = context.getPrefixCls('agentic-md-editor-list');
    const { wrapSSR, hashId } = useStyle(baseCls);

    const tag = element.order ? 'ol' : 'ul';
    debugInfo('ReadonlyList - 渲染', {
      tag,
      order: element.order,
      start: element.start,
      task: element.task,
    });
    return wrapSSR(
      <div
        className={classNames(`${baseCls}-container`, hashId, 'relative')}
        data-be={'list'}
        {...attributes}
      >
        {createElement(
          tag,
          {
            className: classNames(
              baseCls,
              hashId,
              element.order ? 'ol' : 'ul',
            ),
            start: element.start,
            ['data-task']: element.task ? 'true' : undefined,
          },
          children,
        )}
      </div>,
    );
  },
);

ReadonlyList.displayName = 'ReadonlyList';
