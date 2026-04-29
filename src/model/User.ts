export interface User {
    id: number,
    username: string,
    email: string,
    email_verified: boolean,
    password_hash: string,
    token_version: number,
    created_at: Date
}

export interface CreateUserProps {
    username: string;
    email: string;
    password_hash: string;
}

export interface UpdateUserProps {
    username?: string;
    email?: string;
    email_verified?: boolean;
    password_hash?: string;
    token_version?: number;
}