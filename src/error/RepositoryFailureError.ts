/**
 * Error used to represent when an unexpected critical failure has occured
 * with the repository, which should never happen.
 */
export class RepositoryFailureError extends Error {
    /**
     * Construct a new RepositoryFailureError
     * @param message the message of the error
     */
    constructor(message: string) {
        super(message);
        this.name = "RepositoryFailureError";
    }
}