'use client';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Counter } from '@/components/Counter';

export default function Home() {
  return (
    <main
      style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '40px 20px',
      }}
    >
      <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>
        Component Picker Test
      </h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>
        Click the green <strong>Select Component</strong> button in the bottom-right corner, then click any component.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Card title="Buttons" description="Various button styles">
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Button variant="primary" size="sm">Small Primary</Button>
            <Button variant="primary" size="md">Medium Primary</Button>
            <Button variant="primary" size="lg">Large Primary</Button>
            <Button variant="secondary" size="md">Secondary</Button>
          </div>
        </Card>

        <Card title="Counter" description="A stateful counter component">
          <Counter initialValue={5} step={1} />
        </Card>

        <Card title="Nested Components">
          <div style={{ display: 'flex', gap: '16px' }}>
            <Card title="Inner Card 1">
              <Button variant="secondary">Click me</Button>
            </Card>
            <Card title="Inner Card 2">
              <Counter initialValue={0} step={5} />
            </Card>
          </div>
        </Card>
      </div>
    </main>
  );
}
