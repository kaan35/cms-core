# Coding Standards

**Scope:** CMS monorepo (API, Admin, Client)

This document covers conventions that are either non-obvious or have caused bugs in this project. General TypeScript/React best practices are assumed.

---

## Naming Conventions

### Boolean props & variables — always prefix

```typescript
// ✅
isDisabled, isLoading, hasError, shouldRender, canEdit

// ❌
disabled, loading, error, visible, active
```

### Files

| Type | Convention | Example |
|---|---|---|
| React component | PascalCase | `Button.tsx`, `UserForm.tsx` |
| Utility / hook | camelCase | `api.ts`, `useApi.ts` |
| Config / CSS | kebab-case | `next.config.ts`, `global.css` |

---

## API Conventions

### Response shape

Every endpoint returns the same envelope:

```typescript
{ status: "success" | "error", data?: T, message?: string }
```

### Endpoint responsibilities

- **List:** return array + pagination meta (`page`, `limit`, `total`, `totalPages`)
- **Detail:** return single object; support both ObjectId and slug in the same parameter (`idOrSlug`)
- **Create / Update:** return the created/updated document
- **Delete:** return `{ status: "success", message: "..." }` only

### MongoDB ObjectId serialization

Always convert before sending to client — forgetting this causes silent type errors on the frontend:

```typescript
const serialized = posts.map(post => ({ ...post, _id: post._id.toString() }));
```

### Function parameters — prefer object shape for 2+ args

```typescript
// ✅
showToast({ message: "Saved", type: "success", duration: 5000 });

// ❌
showToast("Saved", "success", 5000);
```

---

## Plugin Architecture Rules

### No cross-plugin imports

Plugins must never import from another plugin. Use the core `HookManager`:

```typescript
// plugin-blog
hooks.emit("blog.created", post, user, ip);

// plugin-email (separate plugin, subscribes independently)
hooks.on("blog.created", async (post, user, ip) => { /* send notification */ });
```

### Authorization — permission-based, not JWT-existence-based

Checking that a JWT exists is not authorization. Use explicit permission strings:

```typescript
const canReadDraft = request.user?.permissions?.includes("blog:read:draft");
```

---

## Data Fetching (Admin)

All data fetching goes through `useApiQuery` / `useApiMutation`. Never import `useSWR` or `@tanstack/react-query` directly in pages or components.

```typescript
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
```

### Hook file layout

```
admin/src/hooks/
  types.ts           ← library-agnostic interfaces
  adapters/
    swr.ts           ← SWR (active)
    tanstack.ts      ← TanStack (ready to swap in)
  useApi.ts          ← single re-export line, picks active adapter
```

### Adapter swap — one line change

```typescript
// useApi.ts
export { useApiQuery, useApiMutation } from "./adapters/swr";
// export { useApiQuery, useApiMutation } from "./adapters/tanstack";
```

### `isLoading` vs `isRefreshing`

- `isLoading` — `true` only on the first fetch when there is no cached data. Use for skeleton screens.
- `isRefreshing` — `true` during background revalidation. Use for refresh button spinners.

### SWR gotchas

- **Never pass `undefined` callbacks.** SWR throws `currentConfig.onError is not a function` if `onSuccess` or `onError` are `undefined`. Use conditional spread:

```typescript
// ✅
...(onSuccess && { onSuccess }),
...(onError && { onError }),
```

- **Cross-component sync** — use `refetch()` or `revalidateOnFocus`. Do not dispatch custom browser events.

---

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| DELETE request with `Content-Type` but no body | Only set `Content-Type` when a body is present |
| Non-serialized `ObjectId` in response | Always call `.toString()` before returning |
| Boolean prop without `is/has/can/should` prefix | Rename — no exceptions |
| Hardcoded navigation links | Route through the plugin system |
| Multiple `useState` calls for form fields | Single `formData` object |
