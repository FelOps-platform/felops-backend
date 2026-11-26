import type { UserRecord } from './auth.repository.js';

export interface UserDto {
  id: number;
  name: string;
  email: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isVerified: user.isVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}
