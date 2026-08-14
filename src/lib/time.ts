/** Current local time as "HH:mm" for database storage. */
export function getCurrentTime24(): string {
  return new Date().toTimeString().slice(0, 5);
}
