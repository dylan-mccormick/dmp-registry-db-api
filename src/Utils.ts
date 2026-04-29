/**
 * Checks if a string is valid. A string is valid if:
 * - it is not null
 * - it is not blank/empty
 * - it is less than 255 in length
 * @param s the string to test
 * @returns a boolean describing whether the string is valid
 */
export const verifyValidString = (s: string): boolean => {
    return s?.trim().length > 0 && s?.length <= 255;
}