'use client';

import { ComponentPicker } from '@react-component-selector-mcp/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ComponentPicker
      port={3333}
      onConnectionChange={(connected) => {
        console.log('Connection status:', connected);
      }}
      onSelect={(componentName, filePath) => {
        console.log('Selected component:', componentName, 'at', filePath);
      }}
    >
      {children}
    </ComponentPicker>
  );
}
