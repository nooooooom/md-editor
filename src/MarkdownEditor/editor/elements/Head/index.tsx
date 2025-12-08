import classNames from 'classnames';
import React, { createElement, useEffect, useRef } from 'react';
import { Node } from 'slate';
import { debugInfo } from '../../../../Utils/debugUtils';
import { ElementProps, HeadNode } from '../../../el';
import { useSelStatus } from '../../../hooks/editor';
import { useEditorStore } from '../../store';
import { DragHandle } from '../../tools/DragHandle';
import { slugify } from '../../utils/dom';

export function Head({
  element,
  attributes,
  children,
}: ElementProps<HeadNode>) {
  const headRef = useRef<HTMLHeadingElement>(null);

  debugInfo('Head - 渲染标题', {
    level: element.level,
    text: Node.string(element)?.substring(0, 50),
    align: element.align,
  });
  const { store = {} as Record<string, any>, markdownContainerRef } =
    useEditorStore();
  const [selected, path] = useSelStatus(element);
  const str = Node.string(element);

  useEffect(() => {
    if (headRef.current) {
      debugInfo('Head - 输出 HTML', {
        html: headRef.current.outerHTML.substring(0, 500),
        fullHtml: headRef.current.outerHTML,
      });
    }
  });

  return React.useMemo(() => {
    debugInfo('Head - useMemo 渲染', {
      level: element.level,
      selected,
      path,
      str: str?.substring(0, 50),
    });
    return createElement(
      `h${element.level}`,
      {
        ...attributes,
        ref: headRef,
        id: slugify(str),
        ['data-be']: 'head',
        ['data-head']: slugify(Node.string(element) || ''),
        ['data-title']: path?.[0] === 0,
        onDragStart: (e) => {
          debugInfo('Head - 拖拽开始', { level: element.level });
          store.dragStart(e, markdownContainerRef.current!);
        },
        ['data-empty']: !str && selected ? 'true' : undefined,
        ['data-align']: element.align,
        ['data-drag-el']: true,
        className: classNames({
          empty: !str,
        }),
      },
      <>
        <DragHandle />
        {children}
      </>,
    );
  }, [element.level, str, element.children, selected, path]);
}
