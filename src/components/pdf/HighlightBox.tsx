export default function HighlightBox({ bbox, scale }: { bbox: number[]; scale: number }) {
  const [x0, y0, x1, y1] = bbox;
  return (
    <div
      className="pointer-events-none absolute bg-yellow-300/50 ring-2 ring-yellow-400"
      style={{
        left: x0 * scale,
        top: y0 * scale,
        width: (x1 - x0) * scale,
        height: (y1 - y0) * scale,
      }}
    />
  );
}
