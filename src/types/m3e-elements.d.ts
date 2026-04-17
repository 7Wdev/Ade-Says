import type { HTMLAttributes } from 'react';

type M3eButtonVariant = 'elevated' | 'filled' | 'tonal' | 'outlined' | 'text';
type M3eButtonShape = 'rounded' | 'square';
type M3eButtonSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
type M3eLoadingIndicatorVariant = 'contained' | 'uncontained';
type M3eLinearProgressMode = 'determinate' | 'indeterminate' | 'buffer' | 'query';
type M3eProgressIndicatorVariant = 'flat' | 'wavy';

type M3eButtonProps = HTMLAttributes<HTMLElement> & {
  disabled?: boolean;
  href?: string;
  selected?: boolean;
  shape?: M3eButtonShape;
  size?: M3eButtonSize;
  toggle?: boolean;
  variant?: M3eButtonVariant;
};

type M3eLoadingIndicatorProps = HTMLAttributes<HTMLElement> & {
  variant?: M3eLoadingIndicatorVariant;
};

type M3eLinearProgressIndicatorProps = HTMLAttributes<HTMLElement> & {
  'buffer-value'?: number;
  max?: number;
  mode?: M3eLinearProgressMode;
  value?: number;
  variant?: M3eProgressIndicatorVariant;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'm3e-button': M3eButtonProps;
      'm3e-linear-progress-indicator': M3eLinearProgressIndicatorProps;
      'm3e-loading-indicator': M3eLoadingIndicatorProps;
    }
  }
}
