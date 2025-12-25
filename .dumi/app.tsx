import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import { useAppData } from 'dumi';
import React, { useEffect } from 'react';
import './reset-ant.css';

// 包装组件，用于在应用级别使用 useAppData
const AppWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const appdata = useAppData();

  useEffect(() => {
    console.log('appdata:', appdata);
  }, [appdata]);

  return <>{children}</>;
};

export function rootContainer(container: any) {
  return React.createElement(
    ConfigProvider,
    {
      locale: zhCN,
      prefixCls: 'otk',
    },
    React.createElement(AppWrapper, null, container),
  );
}
