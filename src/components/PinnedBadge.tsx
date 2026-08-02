import { memo } from 'react';
import '@m3e/web/badge';

function PinnedBadge() {
  return (
    <m3e-badge className="pinned-badge" size="large">
      Pinned
    </m3e-badge>
  );
}

export default memo(PinnedBadge);
