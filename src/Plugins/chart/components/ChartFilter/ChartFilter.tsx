import { ChevronDown } from '@sofa-design/icons';
import { Button, ConfigProvider, Dropdown, Segmented } from 'antd';
import classNames from 'classnames';
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { I18nContext } from '../../../../I18n';
import { debounce } from '../../utils';
import { useStyle } from './style';

export interface FilterOption {
  label: string;
  value: string;
}

export interface RegionOption {
  key: string;
  label: string;
}

export interface ChartFilterProps {
  filterOptions?: FilterOption[];
  selectedFilter?: string;
  onFilterChange?: (value: string) => void;
  customOptions?: RegionOption[];
  selectedCustomSelection?: string;
  onSelectionChange?: (region: string) => void;
  className?: string;
  theme?: 'light' | 'dark';
  variant?: 'default' | 'compact';
}

/**
 * 比较两个数组是否相等（浅比较）
 */
const areArraysEqual = (
  a:
    | Array<{ label: string; value: string } | { key: string; label: string }>
    | undefined,
  b:
    | Array<{ label: string; value: string } | { key: string; label: string }>
    | undefined,
): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    if (!other) return false;
    // 比较所有属性
    return Object.keys(item).every(
      (key) => (item as any)[key] === (other as any)[key],
    );
  });
};

/**
 * ChartFilter 组件的 props 比较函数
 * 用于 React.memo 优化，只在真正需要时重新渲染
 *
 * 注意：由于组件内部使用 ref 保存上一次有效的 filterOptions，
 * 即使 filterOptions 暂时为空也不会导致组件消失。
 * 因此比较时，如果当前值为空但之前有值，我们仍然认为它们"相等"（使用稳定值）。
 */
const arePropsEqual = (
  prevProps: ChartFilterProps,
  nextProps: ChartFilterProps,
): boolean => {
  // 比较基本属性
  if (
    prevProps.selectedFilter !== nextProps.selectedFilter ||
    prevProps.selectedCustomSelection !== nextProps.selectedCustomSelection ||
    prevProps.className !== nextProps.className ||
    prevProps.theme !== nextProps.theme ||
    prevProps.variant !== nextProps.variant
  ) {
    return false;
  }

  // 比较数组属性（filterOptions 和 customOptions）
  // 如果两个都是空或都有效，比较内容
  // 如果一个为空一个有效，认为不相等（需要更新稳定值）
  const prevFilterValid =
    prevProps.filterOptions && prevProps.filterOptions.length > 1;
  const nextFilterValid =
    nextProps.filterOptions && nextProps.filterOptions.length > 1;

  // 如果两个都有效，比较内容
  if (prevFilterValid && nextFilterValid) {
    if (!areArraysEqual(prevProps.filterOptions, nextProps.filterOptions)) {
      return false;
    }
  }
  // 如果从有效变为无效，需要更新（返回 false）
  else if (prevFilterValid !== nextFilterValid) {
    return false;
  }
  // 如果两个都无效，认为相等（使用上一次的稳定值）

  const prevCustomValid =
    prevProps.customOptions && prevProps.customOptions.length > 1;
  const nextCustomValid =
    nextProps.customOptions && nextProps.customOptions.length > 1;

  if (prevCustomValid && nextCustomValid) {
    if (!areArraysEqual(prevProps.customOptions, nextProps.customOptions)) {
      return false;
    }
  } else if (prevCustomValid !== nextCustomValid) {
    return false;
  }

  // 回调函数比较
  // 由于我们已经用 ref 处理回调，即使引用变化也不会影响防抖逻辑
  // 为了 memo 优化，我们只检查回调是否存在，不比较引用
  const prevHasFilterChange = prevProps.onFilterChange !== undefined;
  const nextHasFilterChange = nextProps.onFilterChange !== undefined;
  if (prevHasFilterChange !== nextHasFilterChange) {
    return false;
  }

  const prevHasSelectionChange = prevProps.onSelectionChange !== undefined;
  const nextHasSelectionChange = nextProps.onSelectionChange !== undefined;
  if (prevHasSelectionChange !== nextHasSelectionChange) {
    return false;
  }

  // 所有关键属性都相同，可以跳过重新渲染
  return true;
};

const ChartFilterComponent: React.FC<ChartFilterProps> = ({
  filterOptions,
  selectedFilter,
  onFilterChange,
  customOptions,
  selectedCustomSelection,
  onSelectionChange,
  className = '',
  theme = 'light',
  variant = 'default',
}) => {
  const { getPrefixCls } = useContext(ConfigProvider.ConfigContext);
  const i18n = useContext(I18nContext);
  const prefixCls = getPrefixCls('chart-filter');
  const { wrapSSR, hashId } = useStyle(prefixCls);

  // 使用 useRef 保存最新的回调函数，避免防抖函数闭包问题
  const onFilterChangeRef = useRef(onFilterChange);
  const onSelectionChangeRef = useRef(onSelectionChange);

  // 更新 ref，确保总是使用最新的回调
  React.useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
    onSelectionChangeRef.current = onSelectionChange;
  }, [onFilterChange, onSelectionChange]);

  // 创建防抖的回调函数，1秒更新一次
  const debouncedFilterChange = useMemo(
    () =>
      debounce(
        function (value: string) {
          if (onFilterChangeRef.current) {
            onFilterChangeRef.current(value);
          }
        } as any,
        1000,
      ),
    [],
  );

  const debouncedSelectionChange = useMemo(
    () =>
      debounce(
        function (region: string) {
          if (onSelectionChangeRef.current) {
            onSelectionChangeRef.current(region);
          }
        } as any,
        1000,
      ),
    [],
  );

  // 组件卸载时清理防抖函数
  React.useEffect(() => {
    return () => {
      (debouncedFilterChange as any)?.cancel?.();
      (debouncedSelectionChange as any)?.cancel?.();
    };
  }, [debouncedFilterChange, debouncedSelectionChange]);

  // 稳定化 filterOptions 和 customOptions，避免在流式更新时频繁变化导致组件跳动
  // 使用 useState 保存稳定的值，只在内容真正变化时才更新
  const [stableFilterOptions, setStableFilterOptions] = useState<
    FilterOption[] | undefined
  >(() =>
    filterOptions && filterOptions.length > 1 ? filterOptions : undefined,
  );
  const [stableCustomOptions, setStableCustomOptions] = useState<
    RegionOption[] | undefined
  >(() =>
    customOptions && customOptions.length > 1 ? customOptions : undefined,
  );

  // 使用 useRef 保存上一次的值用于内容比较
  const prevFilterOptionsRef = useRef<FilterOption[] | undefined>(
    filterOptions,
  );
  const prevCustomOptionsRef = useRef<RegionOption[] | undefined>(
    customOptions,
  );

  // 当 filterOptions 变化时，只在内容真正变化时才更新
  useEffect(() => {
    if (filterOptions && filterOptions.length > 1) {
      // 比较内容是否真的变化
      const contentChanged = !areArraysEqual(
        prevFilterOptionsRef.current,
        filterOptions,
      );

      if (contentChanged) {
        // 内容变化，更新稳定值
        setStableFilterOptions(filterOptions);
        prevFilterOptionsRef.current = filterOptions;
      }
      // 如果内容相同，不更新，避免不必要的重新渲染
    } else if (filterOptions && filterOptions.length <= 1) {
      // 如果新值无效（长度 <= 1），但之前有有效值，保持上一次的值（不更新）
      // 这样 filter 不会消失
    }
    // 注意：如果 filterOptions 变为 undefined 或 null，我们不更新稳定值，保持上一次的值
  }, [filterOptions]);

  useEffect(() => {
    if (customOptions && customOptions.length > 1) {
      const contentChanged = !areArraysEqual(
        prevCustomOptionsRef.current,
        customOptions,
      );

      if (contentChanged) {
        setStableCustomOptions(customOptions);
        prevCustomOptionsRef.current = customOptions;
      }
    }
  }, [customOptions]);

  const handleRegionChange = (region: string) => {
    (debouncedSelectionChange as any)(region);
  };

  const handleFilterChange = (value: string) => {
    (debouncedFilterChange as any)(value);
  };

  const hasMain =
    Array.isArray(stableFilterOptions) && stableFilterOptions.length > 1;
  const hasSecondary =
    Array.isArray(stableCustomOptions) && stableCustomOptions.length > 1;

  if (!hasMain && !hasSecondary) {
    return null;
  }
  if (!stableFilterOptions || stableFilterOptions.length < 2) {
    return null;
  }

  return wrapSSR(
    <div
      className={classNames(
        prefixCls,
        `${prefixCls}-${theme}`,
        `${prefixCls}-${variant}`,
        hashId,
        className,
      )}
    >
      {/* 地区筛选器，统一逻辑，只有可选时才显示 */}
      {stableCustomOptions && stableCustomOptions.length > 1 && (
        <div className={classNames(`${prefixCls}-region-filter`, hashId)}>
          <Dropdown
            menu={{
              items: stableCustomOptions.map((item) => {
                return {
                  key: item.key,
                  label: item.label,
                  disabled: item.key === selectedCustomSelection,
                };
              }),
              onClick: ({ key }) => handleRegionChange(key),
            }}
            trigger={['click']}
            getPopupContainer={() => document.body}
          >
            <Button
              type="default"
              size="small"
              className={classNames(`${prefixCls}-region-dropdown-btn`, hashId)}
            >
              <span>
                {stableCustomOptions.find(
                  (r) => r.key === selectedCustomSelection,
                )?.label ||
                  i18n?.locale?.all ||
                  '全部'}
              </span>
              <ChevronDown
                className={classNames(`${prefixCls}-dropdown-icon`, hashId)}
              />
            </Button>
          </Dropdown>
        </div>
      )}

      {stableFilterOptions && stableFilterOptions.length > 1 && (
        <Segmented
          options={stableFilterOptions || []}
          value={selectedFilter}
          size="small"
          className={classNames(
            `${prefixCls}-segmented-filter`,
            'custom-segmented',
            hashId,
          )}
          onChange={(value) => handleFilterChange(value as string)}
        />
      )}
    </div>,
  );
};

// 使用 React.memo 包装组件，确保内容稳定，只在 props 真正变化时重新渲染
const ChartFilter = React.memo(ChartFilterComponent, arePropsEqual);

export default ChartFilter;
