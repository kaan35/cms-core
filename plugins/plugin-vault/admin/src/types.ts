export interface VaultItem {
  id?: string | undefined;
  title: string;
  username: string;
  password?: string | undefined;
  url?: string | undefined;
  category?: string | undefined;
  notes?: string | undefined;
  tags?: string[] | undefined;
  passwordChangedAt?: string | Date | undefined;
  createdAt?: string | Date | undefined;
  updatedAt?: string | Date | undefined;
}

export interface VaultStats {
  total?: number;
  categoriesCount?: number;
  recentCount?: number;
  staleCount?: number;
}
