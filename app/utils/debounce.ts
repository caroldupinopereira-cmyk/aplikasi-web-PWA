export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait?: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function (...args: Parameters<T>) {
    const later = () => func(...args);
    clearTimeout(timeout);
    timeout = setTimeout(later, wait ?? 300);
  };
}