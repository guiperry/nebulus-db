/**
 * Converts an object to a JSON string with proper formatting.
 * Ensures all data is properly formatted throughout the application.
 *
 * @param obj - The object to convert to JSON
 * @returns JSON string representation of the object
 */
export function toJSON(obj: any): string {
  return JSON.stringify(obj, null, 2);
}