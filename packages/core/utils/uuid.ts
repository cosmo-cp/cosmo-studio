const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates whether a given string is a syntactically valid UUID.
 */
export function isValidUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_REGEX.test(value);
}
