import { memo, useCallback, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

type M3eRouterButtonProps = {
  children: ReactNode;
  className?: string;
  current?: boolean;
  shape?: 'rounded' | 'square';
  size?: 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
  to: string;
  toggle?: boolean;
  variant?: 'elevated' | 'filled' | 'tonal' | 'outlined' | 'text';
};

function M3eRouterButton({
  children,
  className,
  current = false,
  shape = 'rounded',
  size = 'small',
  to,
  toggle = false,
  variant = 'tonal',
}: M3eRouterButtonProps) {
  const navigate = useNavigate();

  const handlePointerDownCapture = useCallback((event: PointerEvent<HTMLElement>) => {
    const isModifiedPrimary = event.button === 0 && (
      event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
    );

    if (!event.defaultPrevented && (event.button === 1 || isModifiedPrimary)) {
      event.stopPropagation();
    }
  }, []);

  const handleClickCapture = useCallback((event: MouseEvent<HTMLElement>) => {
    if (event.defaultPrevented) {
      return;
    }

    // M3E also handles link activation on the host. Stop that handler here so
    // the real shadow anchor keeps native modifier-click behavior and primary
    // clicks remain owned by React Router.
    event.stopPropagation();

    if (
      event.button !== 0
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
    ) {
      return;
    }

    event.preventDefault();
    if (current) {
      return;
    }

    navigate(to);
  }, [current, navigate, to]);

  return (
    <m3e-button
      aria-current={current ? 'page' : undefined}
      className={className}
      href={to}
      onClickCapture={handleClickCapture}
      onPointerDownCapture={handlePointerDownCapture}
      role="link"
      selected={toggle ? current : undefined}
      shape={shape}
      size={size}
      toggle={toggle}
      variant={variant}
    >
      {children}
    </m3e-button>
  );
}

export default memo(M3eRouterButton);
