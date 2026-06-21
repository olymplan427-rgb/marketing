import React from 'react';

/**
 * Button — DESIGN.md monochrome system.
 * variant: primary(검정 채움) | secondary(아웃라인) | ghost
 * size: sm | md | lg | xl(hero CTA). Sizes match the app's existing button patterns
 * so adoption needs no className overrides (Tailwind utility order isn't guaranteed,
 * so we avoid conflicting overrides by design). All colors are tokens → auto-inverts in dark.
 */
type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  // secondary는 mist 채움 + hairline 보더로 다크/라이트 모두에서 카드 배경과 또렷이 구분된다.
  primary: 'bg-graphite text-chalk hover:bg-carbon',
  secondary: 'bg-mist text-graphite border border-hairline hover:bg-hairline',
  ghost: 'bg-transparent text-graphite hover:bg-mist',
};

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-xs font-medium rounded-lg',
  md: 'px-6 py-2.5 text-sm font-medium rounded-lg',
  lg: 'px-6 py-3 text-sm font-medium rounded-lg',
  xl: 'px-8 py-4 text-lg font-bold rounded-card',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...rest
}) => (
  <button
    className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    {...rest}
  >
    {children}
  </button>
);

export default Button;
