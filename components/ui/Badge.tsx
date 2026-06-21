import React from 'react';

/**
 * Badge — muted pill for inline metadata / status (DESIGN.md).
 * bg-mist + hairline border + graphite text. Auto-inverts in dark mode.
 */
const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className = '', children, ...rest }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium bg-mist text-graphite border border-hairline rounded-full ${className}`}
    {...rest}
  >
    {children}
  </span>
);

export default Badge;
