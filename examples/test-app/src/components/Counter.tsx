'use client';

import { useState } from 'react';
import { Button } from './Button';

interface CounterProps {
  initialValue?: number;
  step?: number;
}

export function Counter({ initialValue = 0, step = 1 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <Button variant="secondary" size="sm" onClick={() => setCount(c => c - step)}>
        -
      </Button>
      <span style={{ fontSize: '24px', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }}>
        {count}
      </span>
      <Button variant="primary" size="sm" onClick={() => setCount(c => c + step)}>
        +
      </Button>
    </div>
  );
}
