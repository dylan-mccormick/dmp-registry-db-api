import { Request, Response, NextFunction } from "express";

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

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};