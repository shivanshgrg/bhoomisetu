import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

type QrCodeProps = {
  value: string;
  size?: number;
  ariaLabel: string;
};

// Renders a scannable QR code as inline SVG rects (no canvas, no image
// asset) using `qrcode-generator` — a well-tested, dependency-free encoder —
// for the module matrix. The quiet zone, module fill and background are
// fixed to black-on-white regardless of the app's light/dark theme: this
// output is meant to be printed on paper and scanned by a phone camera, so
// contrast must never depend on which theme the officer's screen is in.
export function QrCode({ value, size = 168, ariaLabel }: QrCodeProps) {
  const modules = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const cells: boolean[][] = [];
    for (let row = 0; row < count; row += 1) {
      const rowCells: boolean[] = [];
      for (let col = 0; col < count; col += 1) {
        rowCells.push(qr.isDark(row, col));
      }
      cells.push(rowCells);
    }
    return cells;
  }, [value]);

  const quietZone = 4;
  const moduleCount = modules.length;
  const viewBoxSize = moduleCount + quietZone * 2;

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      style={{ background: '#ffffff', display: 'block' }}
    >
      <rect x={0} y={0} width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
      {modules.map((row, rowIndex) =>
        row.map(
          (isDark, colIndex) =>
            isDark && (
              <rect
                key={`${rowIndex}-${colIndex}`}
                x={colIndex + quietZone}
                y={rowIndex + quietZone}
                width={1}
                height={1}
                fill="#000000"
              />
            ),
        ),
      )}
    </svg>
  );
}
