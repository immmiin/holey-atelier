import raw from '../assets/holey-wordmark-currentColor.svg?raw';

// Inline so fill="currentColor" follows CSS (brand green by default).
const markup = raw
  .replace(/\sviewBox="[^"]+"/, ' viewBox="48 40 2252 1526"')
  .replace(/\swidth="\d+"\s+height="\d+"/, ' role="img" aria-label="Holey" focusable="false"');

export default function Wordmark({ className = '' }: { className?: string }) {
  return <span className={`wordmark ${className}`} dangerouslySetInnerHTML={{ __html: markup }} />;
}
