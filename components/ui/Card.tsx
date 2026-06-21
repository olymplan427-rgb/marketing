import React from 'react';

/**
 * Card — flat border-first surface (DESIGN.md).
 * bg-chalk + 1px hairline border + 14px radius, no shadow. Auto-inverts in dark mode.
 */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const pad: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const Card: React.FC<CardProps> = ({ padding = 'md', className = '', children, ...rest }) => (
  <div className={`bg-chalk border border-hairline rounded-card ${pad[padding]} ${className}`} {...rest}>
    {children}
  </div>
);

export default Card;
