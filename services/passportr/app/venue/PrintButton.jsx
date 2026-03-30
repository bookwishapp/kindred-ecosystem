'use client';

export default function PrintButton() {
  return (
    <button onClick={() => window.print()}>
      Print This Page
    </button>
  );
}
