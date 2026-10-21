// The wordmark borrows the colour of whichever sock you're looking at.
// A tiny stack so a product page's accent survives a hover elsewhere.
const stack = [];

function apply() {
  const top = stack[stack.length - 1];
  const root = document.documentElement;
  if (top) root.style.setProperty('--logo-accent', top.color);
  else root.style.removeProperty('--logo-accent');
}

export function pushAccent(color) {
  const token = { color };
  stack.push(token);
  apply();
  return () => {
    const i = stack.indexOf(token);
    if (i > -1) stack.splice(i, 1);
    apply();
  };
}
