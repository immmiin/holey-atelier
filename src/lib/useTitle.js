import { useEffect } from 'react';

const BASE = 'Holey — One sock. Hole included. Hand-distressed by you.';

export default function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Holey` : BASE;
  }, [title]);
}
