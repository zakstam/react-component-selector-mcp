import { toPng } from 'html-to-image';
import type { Screenshot } from '@react-component-selector-mcp/shared';

export interface CaptureOptions {
  /** Maximum width of the screenshot (default: 800) */
  maxWidth?: number;
  /** Maximum height of the screenshot (default: 600) */
  maxHeight?: number;
  /** Background color (default: transparent) */
  backgroundColor?: string;
  /** Pixel ratio for higher quality (default: 1) */
  pixelRatio?: number;
  /** Padding around the element (default: 10) */
  padding?: number;
}

const DEFAULT_OPTIONS: Required<CaptureOptions> = {
  maxWidth: 800,
  maxHeight: 600,
  backgroundColor: '#ffffff',
  pixelRatio: 1,
  padding: 10,
};

/**
 * Capture a screenshot of an HTML element
 */
export async function captureScreenshot(
  element: HTMLElement,
  options: CaptureOptions = {}
): Promise<Screenshot> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Get element dimensions
    const rect = element.getBoundingClientRect();
    const width = Math.min(rect.width + opts.padding * 2, opts.maxWidth);
    const height = Math.min(rect.height + opts.padding * 2, opts.maxHeight);

    // Capture the element
    const dataUrl = await toPng(element, {
      backgroundColor: opts.backgroundColor,
      pixelRatio: opts.pixelRatio,
      width: rect.width,
      height: rect.height,
      style: {
        margin: '0',
        padding: '0',
      },
      // Skip font embedding to avoid errors with undefined font properties
      skipFonts: true,
      filter: (node) => {
        // Skip our overlay elements
        if (node instanceof Element) {
          if (node.hasAttribute('data-component-picker')) {
            return false;
          }
        }
        return true;
      },
    });

    return {
      dataUrl,
      width: Math.round(width),
      height: Math.round(height),
    };
  } catch (error) {
    console.error('[component-picker] Screenshot capture failed:', error);

    // Return a fallback empty screenshot
    return {
      dataUrl: createFallbackScreenshot(element),
      width: 200,
      height: 100,
    };
  }
}

/**
 * Create a simple fallback screenshot when capture fails
 */
function createFallbackScreenshot(element: HTMLElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 200, 100);

    ctx.fillStyle = '#666';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Screenshot unavailable', 100, 45);
    ctx.fillText(element.tagName.toLowerCase(), 100, 65);
  }

  return canvas.toDataURL('image/png');
}
