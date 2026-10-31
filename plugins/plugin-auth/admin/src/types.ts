export interface UserItem {
  id: string;
  email: string;
  role: string;
  name?: string | undefined;
  status?: string | undefined;
  createdAt?: string | undefined;
  roleIds?: string[] | undefined;
  permissions?: string[] | undefined;
}

export interface UserStats {
  total?: number;
  adminCount?: number;
  activeCount?: number;
}

export interface RoleItem {
  id: string;
  name: string;
  description?: string | undefined;
  permissions: string[];
  isSystem?: boolean | undefined;
  createdAt?: string | undefined;
}

export interface RoleStats {
  total?: number;
  systemCount?: number;
  customCount?: number;
}

export interface ApiTokenItem {
  id: string;
  name: string;
  tokenPrefix?: string | undefined;
  scopes: string[];
  expiresAt?: string | null | undefined;
  revokedAt?: string | null | undefined;
  revokeReason?: string | null | undefined;
  createdAt: string;
  lastUsedAt?: string | null | undefined;
}

export interface ApiTokenStats {
  total?: number;
  activeCount?: number;
  fullAccessCount?: number;
}
