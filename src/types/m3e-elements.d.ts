import type { Attributes, HTMLAttributes, RefAttributes } from 'react';
import type { ShapeName } from '@m3e/web/shape';
import type {
  ColorScheme,
  ContrastLevel,
  M3eThemeElement,
  MotionScheme,
  ThemeVariant,
} from '@m3e/web/theme';

type M3eElementAttributes = Attributes & HTMLAttributes<HTMLElement>;

type M3eButtonVariant = 'elevated' | 'filled' | 'tonal' | 'outlined' | 'text';
type M3eButtonShape = 'rounded' | 'square';
type M3eButtonSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
type M3eButtonGroupVariant = 'standard' | 'connected';
type M3eCardVariant = 'filled' | 'elevated' | 'outlined';
type M3eCardOrientation = 'horizontal' | 'vertical';
type M3eIconButtonVariant = 'filled' | 'tonal' | 'outlined' | 'standard';
type M3eIconButtonWidth = 'default' | 'narrow' | 'wide';
type M3eFabVariant = 'primary' | 'secondary' | 'tertiary' | 'primary-container' | 'secondary-container' | 'tertiary-container' | 'surface';
type M3eFabSize = 'small' | 'medium' | 'large';
type M3eFabMenuVariant = 'primary' | 'secondary' | 'tertiary';
type M3eLoadingIndicatorVariant = 'contained' | 'uncontained';
type M3eLinearProgressMode = 'determinate' | 'indeterminate' | 'buffer' | 'query';
type M3eProgressIndicatorVariant = 'flat' | 'wavy';
type M3eBadgePosition = 'above' | 'above-after' | 'above-before' | 'after' | 'before' | 'below' | 'below-after' | 'below-before';
type M3eBadgeSize = 'small' | 'medium' | 'large';
type M3eChipVariant = 'outlined' | 'elevated';
type M3eIconGrade = 'low' | 'medium' | 'high';
type M3eIconVariant = 'outlined' | 'rounded' | 'sharp';
type M3eIconWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700;
type M3eSkeletonAnimation = 'wave' | 'pulse' | 'none';
type M3eSkeletonShape = 'auto' | 'rounded' | 'square' | 'circular';
type M3eToolbarShape = 'rounded' | 'square';
type M3eToolbarVariant = 'standard' | 'vibrant';

type M3eButtonProps = M3eElementAttributes & {
  download?: boolean | string;
  disabled?: boolean;
  'disabled-interactive'?: boolean;
  href?: string;
  rel?: string;
  selected?: boolean;
  shape?: M3eButtonShape;
  size?: M3eButtonSize;
  target?: string;
  toggle?: boolean;
  type?: 'button' | 'reset' | 'submit';
  variant?: M3eButtonVariant;
};

type M3eButtonGroupProps = M3eElementAttributes & {
  multi?: boolean;
  size?: M3eButtonSize;
  variant?: M3eButtonGroupVariant;
};

type M3eCardProps = M3eElementAttributes & {
  actionable?: boolean;
  disabled?: boolean;
  'disabled-interactive'?: boolean;
  inline?: boolean;
  orientation?: M3eCardOrientation;
  variant?: M3eCardVariant;
};

type M3eIconButtonProps = M3eElementAttributes & {
  download?: boolean | string;
  disabled?: boolean;
  'disabled-interactive'?: boolean;
  href?: string;
  rel?: string;
  selected?: boolean;
  shape?: M3eButtonShape;
  size?: M3eButtonSize;
  target?: string;
  toggle?: boolean;
  type?: 'button' | 'reset' | 'submit';
  variant?: M3eIconButtonVariant;
  width?: M3eIconButtonWidth;
};

type M3eLoadingIndicatorProps = M3eElementAttributes & {
  variant?: M3eLoadingIndicatorVariant;
};

type M3eFabProps = M3eElementAttributes & {
  download?: boolean | string;
  disabled?: boolean;
  'disabled-interactive'?: boolean;
  extended?: boolean;
  href?: string;
  lowered?: boolean;
  rel?: string;
  size?: M3eFabSize;
  target?: string;
  type?: 'button' | 'reset' | 'submit';
  variant?: M3eFabVariant;
};

type M3eFabMenuProps = M3eElementAttributes & {
  id?: string;
  variant?: M3eFabMenuVariant;
};

type M3eFabMenuItemProps = M3eElementAttributes & {
  disabled?: boolean;
  download?: boolean | string;
  href?: string;
  rel?: string;
  target?: string;
};

type M3eFabMenuTriggerProps = M3eElementAttributes & {
  for?: string;
};

type M3eLinearProgressIndicatorProps = M3eElementAttributes & {
  'buffer-value'?: number;
  max?: number;
  mode?: M3eLinearProgressMode;
  value?: number;
  variant?: M3eProgressIndicatorVariant;
};

type M3eSearchBarProps = M3eElementAttributes & {
  clearable?: boolean;
  'clear-label'?: string;
};

type M3eBadgeProps = M3eElementAttributes & {
  for?: string;
  position?: M3eBadgePosition;
  size?: M3eBadgeSize;
};

type M3eButtonSegmentProps = M3eElementAttributes & {
  checked?: boolean;
  disabled?: boolean;
  value?: string;
};

type M3eChipProps = M3eElementAttributes & {
  value?: string;
  variant?: M3eChipVariant;
};

type M3eChipSetProps = M3eElementAttributes & {
  vertical?: boolean;
};

type M3eDividerProps = M3eElementAttributes & {
  inset?: boolean;
  'inset-end'?: boolean;
  'inset-start'?: boolean;
  vertical?: boolean;
};

type M3eIconProps = M3eElementAttributes & {
  filled?: boolean;
  grade?: M3eIconGrade;
  name: string;
  'optical-size'?: number;
  variant?: M3eIconVariant;
  weight?: M3eIconWeight;
};

type M3eSegmentedButtonProps = M3eElementAttributes & {
  disabled?: boolean;
  'hide-selection-indicator'?: boolean;
  multi?: boolean;
  name?: string;
};

type M3eSkeletonProps = M3eElementAttributes & {
  animation?: M3eSkeletonAnimation;
  loaded?: boolean;
  shape?: M3eSkeletonShape;
};

type M3eShapeProps = M3eElementAttributes & {
  name?: ShapeName;
};

type M3eToolbarProps = M3eElementAttributes & {
  elevated?: boolean;
  shape?: M3eToolbarShape;
  variant?: M3eToolbarVariant;
  vertical?: boolean;
};

type M3eTocProps = M3eElementAttributes & RefAttributes<HTMLElement> & {
  for?: string;
  'max-depth'?: number;
};

type M3eThemeProps = M3eElementAttributes & RefAttributes<M3eThemeElement> & {
  color?: string;
  contrast?: ContrastLevel;
  density?: number;
  motion?: MotionScheme;
  scheme?: ColorScheme;
  'strong-focus'?: boolean;
  variant?: ThemeVariant;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'm3e-badge': M3eBadgeProps;
      'm3e-button': M3eButtonProps;
      'm3e-button-group': M3eButtonGroupProps;
      'm3e-button-segment': M3eButtonSegmentProps;
      'm3e-card': M3eCardProps;
      'm3e-chip': M3eChipProps;
      'm3e-chip-set': M3eChipSetProps;
      'm3e-divider': M3eDividerProps;
      'm3e-icon': M3eIconProps;
      'm3e-icon-button': M3eIconButtonProps;
      'm3e-fab': M3eFabProps;
      'm3e-fab-menu': M3eFabMenuProps;
      'm3e-fab-menu-item': M3eFabMenuItemProps;
      'm3e-fab-menu-trigger': M3eFabMenuTriggerProps;
      'm3e-linear-progress-indicator': M3eLinearProgressIndicatorProps;
      'm3e-loading-indicator': M3eLoadingIndicatorProps;
      'm3e-search-bar': M3eSearchBarProps;
      'm3e-segmented-button': M3eSegmentedButtonProps;
      'm3e-shape': M3eShapeProps;
      'm3e-skeleton': M3eSkeletonProps;
      'm3e-theme': M3eThemeProps;
      'm3e-toc': M3eTocProps;
      'm3e-toolbar': M3eToolbarProps;
    }
  }
}
