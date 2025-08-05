import { apiRequest } from "./queryClient";
import type { User, InsertUser } from "@shared/schema";

const USER_STORAGE_KEY = 'gameUser';

export function getCurrentUser(): User | null {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get current user from storage:', error);
    return null;
  }
}

export function setCurrentUser(user: User): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to store current user:', error);
  }
}

export function clearCurrentUser(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear current user:', error);
  }
}

export function generateGuestNickname(): string {
  const guestNumber = Math.floor(Math.random() * 9999) + 1;
  return `Guest_${guestNumber.toString().padStart(4, '0')}`;
}

export async function ensureUserExists(): Promise<User> {
  let user = getCurrentUser();
  
  if (!user) {
    // Create new guest user
    const nickname = generateGuestNickname();
    const userData: InsertUser = {
      nickname,
      isGuest: true,
    };

    try {
      const response = await apiRequest('POST', '/api/users', userData);
      user = await response.json();
      setCurrentUser(user!);
    } catch (error) {
      console.error('Failed to create user:', error);
      throw new Error('Failed to create user account');
    }
  } else {
    // Validate existing user session
    const isValid = await validateUserSession(user);
    if (!isValid) {
      console.log('사용자 세션이 유효하지 않음, 새로 생성합니다.');
      clearCurrentUser();
      
      const nickname = generateGuestNickname();
      const userData: InsertUser = {
        nickname,
        isGuest: true,
      };

      try {
        const response = await apiRequest('POST', '/api/users', userData);
        user = await response.json();
        setCurrentUser(user!);
      } catch (error) {
        console.error('Failed to create user:', error);
        throw new Error('Failed to create user account');
      }
    }
  }

  return user!;
}

export async function validateUserSession(user: User): Promise<boolean> {
  try {
    const response = await fetch(`/api/users/${user.id}`);
    return response.ok;
  } catch (error) {
    console.error('Failed to validate user session:', error);
    return false;
  }
}
