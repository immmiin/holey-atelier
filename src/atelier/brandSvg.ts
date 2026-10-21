import raw from '../../public/logo/holey-wordmark-currentColor.svg?raw';

/** a standalone, coloured copy of the wordmark (for drawing into canvases) */
export const wordmarkSvg = (color: string) =>
  raw
    .replace(/currentColor/g, color)
    .replace(/\sviewBox="[^"]+"/, ' viewBox="48 40 2252 1526"')
    .replace(/\swidth="\d+"\s+height="\d+"/, ' width="2252" height="1526"');
