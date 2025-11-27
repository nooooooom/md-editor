import { Skeleton } from 'antd';
import classNames from 'classnames';
import React, { useContext } from 'react';
import { Node } from 'slate';
import { I18nContext } from '../../../I18n';
import { ElementProps, ParagraphNode } from '../../el';
import { useSelStatus } from '../../hooks/editor';
import { useEditorStore } from '../store';
import { DragHandle } from '../tools/DragHandle';

export const Paragraph = (props: ElementProps<ParagraphNode>) => {
  const {
    store,
    markdownEditorRef,
    markdownContainerRef,
    readonly,
    editorProps,
  } = useEditorStore();
  const { locale } = useContext(I18nContext);
  const [selected] = useSelStatus(props.element);

  return React.useMemo(() => {
    const str = Node.string(props.element).trim();
    const isEmpty =
      !str &&
      markdownEditorRef.current?.children.length === 1 &&
      props.element?.children?.every?.(
        (child: any) => !child.type && !child.code && !child.tag,
      )
        ? true
        : undefined;

    // 检查是否是表格加载占位符
    const isTablePlaceholder =
      props.element?.otherProps?.placeholder === true &&
      props.element?.otherProps?.loading === true;

    // 如果是表格占位符，显示表格样式的 Skeleton
    if (isTablePlaceholder) {
      return (
        <div
          {...props.attributes}
          data-be={'paragraph'}
          data-drag-el
          data-placeholder="table-skeleton"
          style={{
            padding: '16px',
            margin: '8px 0',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
          }}
        >
          {/* 表头 Skeleton */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            {Array.from({ length: 3 }).map((_, colIndex) => (
              <Skeleton.Input
                key={colIndex}
                active
                style={{
                  flex: 1,
                  height: 20,
                }}
              />
            ))}
          </div>
          {/* 表格行 Skeleton */}
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: 8,
                marginBottom: 8,
              }}
            >
              {Array.from({ length: 3 }).map((_, colIndex) => (
                <Skeleton.Input
                  key={colIndex}
                  active
                  style={{
                    flex: 1,
                    height: 20,
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div
        {...props.attributes}
        data-be={'paragraph'}
        data-drag-el
        className={classNames({
          empty: isEmpty,
        })}
        data-align={props.element.align}
        data-slate-placeholder={
          isEmpty
            ? editorProps.titlePlaceholderContent ||
              locale?.inputPlaceholder ||
              '请输入内容...'
            : undefined
        }
        onDragStart={(e) => store.dragStart(e, markdownContainerRef.current!)}
        data-empty={isEmpty}
        style={{
          display: !!str || !!props.children?.at(0).type ? undefined : 'none',
        }}
      >
        <DragHandle />
        {props.children}
      </div>
    );
  }, [
    props.element.children,
    props.element.align,
    props.element?.otherProps?.placeholder,
    props.element?.otherProps?.loading,
    readonly,
    selected,
    markdownEditorRef.current?.children.length,
    editorProps.titlePlaceholderContent,
  ]);
};
