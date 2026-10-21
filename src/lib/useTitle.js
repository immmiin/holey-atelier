import { useEffect } from 'react';

const BASE = 'Holey — One sock. One hole.';

export default function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Holey` : BASE;
  }, [title]);
}
