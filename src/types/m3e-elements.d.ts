import type { HTMLAttributes } from 'react';

type M3eButtonVariant = 'elevated' | 'filled' | 'tonal' | 'outlined' | 'text';
type M3eButtonShape = 'rounded' | 'square';
type M3eButtonSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
type M3eFabVariant = 'primary' | 'secondary' | 'tertiary' | 'primary-container' | 'secondary-container' | 'tertiary-container' | 'surface';
type M3eFabSize = 'small' | 'medium' | 'large';
type M3eFabMenuVariant = 'primary' | 'secondary' | 'tertiary';
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

type M3eFabProps = HTMLAttributes<HTMLElement> & {
  disabled?: boolean;
  extended?: boolean;
  href?: string;
  lowered?: boolean;
  size?: M3eFabSize;
  variant?: M3eFabVariant;
};

type M3eFabMenuProps = HTMLAttributes<HTMLElement> & {
  id?: string;
  variant?: M3eFabMenuVariant;
};

type M3eFabMenuItemProps = HTMLAttributes<HTMLElement> & {
  disabled?: boolean;
  download?: boolean | string;
  href?: string;
  rel?: string;
  target?: string;
};

type M3eFabMenuTriggerProps = HTMLAttributes<HTMLElement> & {
  for?: string;
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
      'm3e-fab': M3eFabProps;
      'm3e-fab-menu': M3eFabMenuProps;
      'm3e-fab-menu-item': M3eFabMenuItemProps;
      'm3e-fab-menu-trigger': M3eFabMenuTriggerProps;
      'm3e-linear-progress-indicator': M3eLinearProgressIndicatorProps;
      'm3e-loading-indicator': M3eLoadingIndicatorProps;
    }
  }
}
