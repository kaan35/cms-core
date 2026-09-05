"use client";

import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@cms/admin-shell";
import { Lock, Mail, User } from "lucide-react";

interface UserProfileCardProps {
  isNew: boolean;
  email: string;
  name: string;
  password: string;
  role: string;
  rolesData: Array<{ id: string; name: string; permissions: string[] }>;
  onEmailChange: (email: string) => void;
  onNameChange: (name: string) => void;
  onPasswordChange: (password: string) => void;
  onRoleChange: (role: string) => void;
}

export function UserProfileCard({
  isNew,
  email,
  name,
  password,
  role,
  rolesData,
  onEmailChange,
  onNameChange,
  onPasswordChange,
  onRoleChange,
}: UserProfileCardProps) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      <div className="pb-3 border-b border-border/60">
        <h2 className="text-sm font-semibold text-foreground">Account Profile</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Basic identity and authentication credentials
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs font-medium">
            Email Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="user@example.com"
            iconStart={<Mail />}
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            required
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs font-medium">
            Full Name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            iconStart={<User />}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-medium">
            Password{" "}
            {isNew ? (
              <span className="text-destructive">*</span>
            ) : (
              <span className="text-muted-foreground font-normal">
                (Leave blank to keep unchanged)
              </span>
            )}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={isNew ? "Enter secure password" : "••••••••"}
            iconStart={<Lock />}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            required={isNew}
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="role" className="text-xs font-medium">
            Role Template
          </Label>
          <Select value={role} onValueChange={(val) => val && onRoleChange(val)}>
            <SelectTrigger id="role" className="w-full text-xs">
              <SelectValue placeholder="Select a role template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Administrator</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="user">User</SelectItem>
              {rolesData
                ?.filter((r) => !["admin", "editor", "user"].includes(r.name))
                .map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
