export function generateJobNumber(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `J-${year}-${random}${timestamp.toString().slice(-3)}`;
}
