/**
 * Error used when the the SQL query has failed for an unknown
 * reason.
 */
export class RespositoryError extends Error {
    /**
     * Construct a new RepositoryError
     * @param message the message of the error
     */
    constructor(message: string) {
        super(message);
        this.name = "RepositoryError";
    }
}