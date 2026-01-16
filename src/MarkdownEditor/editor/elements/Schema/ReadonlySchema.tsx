import React, { useContext } from 'react';
import { RenderElementProps } from 'slate-react';
import { BubbleConfigContext } from '../../../../Bubble/BubbleConfigProvide';
import { SchemaRenderer } from '../../../../Schema';
import { debugInfo } from '../../../../Utils/debugUtils';
import { useEditorStore } from '../../store';

/**
 * ReadonlySchema 组件 - 只读模式渲染组件
 *
 * 专门针对 readonly 模式优化的模式组件，移除了编辑相关功能。
 * 简化渲染逻辑，提升预览模式性能。
 *
 * @component
 * @description 只读模式预览组件，用于预览模式下的模式渲染
 * @param {RenderElementProps} props - 组件属性
 * @param {any} props.element - 模式节点元素
 * @param {React.ReactNode} props.children - 子组件内容
 * @param {Object} props.attributes - 元素属性
 *
 * @example
 * ```tsx
 * <ReadonlySchema
 *   element={schemaNode}
 *   attributes={attributes}
 * >
 *   模式内容
 * </ReadonlySchema>
 * ```
 *
 * @returns {React.ReactElement} 渲染的只读模式组件
 *
 * @remarks
 * - 移除编辑相关功能
 * - 使用 React.memo 优化性能
 * - 保持预览模式的视觉效果
 */
export const ReadonlySchema: React.FC<RenderElementProps> = React.memo(
  (props) => {
    debugInfo('ReadonlySchema - 渲染只读 Schema', {
      language: props.element.language,
      valueType: typeof props.element.value,
      hasApaasify: !!(props.element as any).apaasify,
    });
    const { element: node } = props;
    const { editorProps } = useEditorStore();
    const apaasify = editorProps?.apaasify || editorProps?.apassify;

    const { bubble } = useContext(BubbleConfigContext) || {};

    if (apaasify?.enable && apaasify.render) {
      debugInfo('ReadonlySchema - 使用自定义 apaasify 渲染');
      const renderedContent = apaasify.render(props, bubble?.originData);
      return (
        <div
          {...node.attributes}
          data-testid="schema-container"
          contentEditable={false}
          style={{
            display: 'flex',
            flexDirection: 'column',
            userSelect: 'text',
            WebkitUserSelect: 'text',
          }}
        >
          {renderedContent}
          <div
            data-testid="schema-hidden-json"
            style={{
              height: 1,
              opacity: 0,
              userSelect: 'none',
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
            {JSON.stringify(props.element.value, null, 2)}
          </div>
        </div>
      );
    }

    if (node.language === 'agentar-card') {
      debugInfo('ReadonlySchema - 使用 AgentAR 卡片渲染');
      return (
        <div
          data-testid="agentar-card-container"
          style={{
            padding: '0.5em',
          }}
          data-agentar-card
        >
          <SchemaRenderer
            schema={props.element.value}
            bubble={bubble}
            readonly={true}
          />
        </div>
      );
    }

    debugInfo('ReadonlySchema - 使用默认 JSON 渲染');
    return (
      <pre
        {...props.attributes}
        style={{
          background: 'rgb(242, 241, 241)',
          color: 'rgb(27, 27, 27)',
          padding: '1em',
          borderRadius: '0.5em',
          margin: '1em 0',
          fontSize: '0.8em',
          fontFamily: 'monospace',
          lineHeight: '1.5',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          wordWrap: 'break-word',
        }}
      >
        <code>{JSON.stringify(props.element.value, null, 2)}</code>
        <div
          style={{
            display: 'none',
          }}
        >
          {props.children}
        </div>
      </pre>
    );
  },
);

ReadonlySchema.displayName = 'ReadonlySchema';
