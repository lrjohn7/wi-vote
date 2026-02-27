interface ScreenReaderOnlyProps {
  children: React.ReactNode;
  as?: keyof JSX.IntrinsicElements;
}

/**
 * Visually hidden but accessible to screen readers.
 * Uses the sr-only pattern from Tailwind CSS.
 */
export function ScreenReaderOnly({ children, as: Tag = 'span' }: ScreenReaderOnlyProps) {
  return (
    <Tag className="sr-only">
      {children}
    </Tag>
  );
}
