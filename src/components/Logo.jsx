import wordmark from '../../public/logo/holey-wordmark-currentColor.svg?raw';

// Inline so `fill="currentColor"` follows CSS (green #1F5B3A by default, sock accent on hover/PDP).
const markup = wordmark
  .replace(/<metadata>[\s\S]*?<\/metadata>/, '') // drop the embedded C2PA manifest from the bundle
  .replace(/\sviewBox="[^"]+"/, ' viewBox="48 40 2252 1526"') // trim the artboard padding
  .replace(/\swidth="\d+"\s+height="\d+"/, ' role="img" aria-hidden="true" focusable="false"');

export default function Logo({ className = '' }) {
  return <span className={`logo ${className}`} dangerouslySetInnerHTML={{ __html: markup }} />;
}
