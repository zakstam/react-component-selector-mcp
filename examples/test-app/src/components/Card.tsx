'use client';

interface CardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function Card({ title, description, children }: CardProps) {
  return (
    <div
      className="card"
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        minHeight: '200px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <h3 className="card-title" style={{ margin: '0 0 8px', fontSize: '18px', color: '#333' }}>
        {title}
      </h3>
      {description && (
        <p className="card-description" style={{ margin: '0 0 16px', color: '#666', fontSize: '14px' }}>
          {description}
        </p>
      )}
      <div className="card-content">
        {children}
      </div>
    </div>
  );
}
