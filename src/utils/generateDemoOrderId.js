export function generateDemoOrderId() {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `SC-${suffix}`;
}
