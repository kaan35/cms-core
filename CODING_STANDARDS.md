# Coding Standards & Best Practices

**Version:** 1.1.0  
**Last Updated:** June 21, 2026  
**Scope:** CMS Project (Admin, API, Client)

---

## General Principles

- Write clean, maintainable, and self-documenting code
- Follow DRY (Don't Repeat Yourself) principle
- Prefer composition over inheritance
- Keep functions small and focused on a single responsibility
- Use meaningful variable and function names

---

## Naming Conventions

### Boolean Props & Variables
- **ALWAYS** prefix with `is`, `has`, `should`, or `can`
- ✅ Good: `isDisabled`, `isLoading`, `hasError`, `shouldRender`, `canEdit`
- ❌ Bad: `disabled`, `loading`, `error`, `visible`, `active`

### Functions & Methods
- Use verb phrases for actions: `fetchData`, `handleClick`, `validateForm`
- Use question format for predicates: `isValid`, `hasPermission`, `canAccess`

### React Components
- PascalCase for component names: `UserForm`, `BlogPost`, `PageLayout`
- camelCase for prop names: `onClick`, `isDisabled`, `userName`

### Files & Directories
- kebab-case for CSS/config files: `global.css`, `next.config.ts`
- PascalCase for React component files: `Button.tsx`, `UserForm.tsx`
- camelCase for utility files: `api.ts`, `utils.ts`, `toast.tsx`

---

## Modern JavaScript/TypeScript Best Practices

### Variable Declarations
```typescript
// ✅ Use const for values that won't be reassigned
const API_URL = "http://localhost:3000";
const user = { name: "John" };

// ✅ Use let for values that will change
let counter = 0;
counter++;

// ❌ Never use var
var oldStyle = "avoid this"; // Hoisting issues, function scope
```

### Comparison Operators
```typescript
// ✅ Always use strict equality
if (value === 0) { }
if (status !== "active") { }

// ❌ Never use loose equality
if (value == 0) { } // Type coercion issues
if (status != "active") { }

// ✅ Nullish checks
const name = user?.name ?? "Guest";
if (value !== null && value !== undefined) { }
```

### Array Methods (Prefer Functional over Imperative)
```typescript
// ✅ Use array methods
const activeUsers = users.filter(u => u.isActive);
const userNames = users.map(u => u.name);
const total = prices.reduce((sum, price) => sum + price, 0);

// ❌ Avoid traditional for loops when not needed
const activeUsers = [];
for (let i = 0; i < users.length; i++) {
  if (users[i].isActive) activeUsers.push(users[i]);
}
```

### Template Literals
```typescript
// ✅ Use template literals for string concatenation
const message = `Hello, ${user.name}!`;
const url = `/api/users/${userId}/posts`;

// ❌ Avoid string concatenation
const message = "Hello, " + user.name + "!";
const url = "/api/users/" + userId + "/posts";
```

### Destructuring
```typescript
// ✅ Use destructuring for objects and arrays
const { name, email } = user;
const [first, second] = items;
const { data, isLoading, error } = useApiQuery("/users");

// ✅ With defaults
const { theme = "dark", lang = "en" } = settings;

// ✅ Nested destructuring
const { user: { profile: { avatar } } } = response;
```

### Arrow Functions
```typescript
// ✅ Use arrow functions for callbacks and short functions
const doubled = numbers.map(n => n * 2);
const handleClick = () => setCount(count + 1);

// ✅ Use traditional functions for methods needing 'this'
class Component {
  handleEvent() {
    // 'this' refers to Component instance
  }
}

// ✅ Omit parentheses for single parameter
items.forEach(item => console.log(item));

// ✅ Use parentheses for multiple parameters or no parameters
items.forEach((item, index) => console.log(item, index));
const fetch = () => apiFetch("/data");
```

### Async/Await over Promises
```typescript
// ✅ Use async/await for better readability
async function fetchUser(id: string) {
  try {
    const user = await apiFetch(`/users/${id}`);
    const posts = await apiFetch(`/users/${id}/posts`);
    return { user, posts };
  } catch (error) {
    handleError(error);
  }
}

// ❌ Avoid promise chains when async/await is clearer
function fetchUser(id: string) {
  return apiFetch(`/users/${id}`)
    .then(user => apiFetch(`/users/${id}/posts`)
      .then(posts => ({ user, posts })))
    .catch(error => handleError(error));
}

// ✅ Use Promise.all for parallel requests
const [users, posts, comments] = await Promise.all([
  apiFetch("/users"),
  apiFetch("/posts"),
  apiFetch("/comments")
]);
```

### Optional Chaining & Nullish Coalescing
```typescript
// ✅ Use optional chaining
const city = user?.address?.city;
const result = callback?.();

// ✅ Use nullish coalescing (only for null/undefined)
const port = config.port ?? 3000;
const name = user.name ?? "Anonymous";

// ❌ Avoid logical OR for defaults (catches 0, false, "")
const port = config.port || 3000; // Wrong if port is 0
```

### Object Shorthand
```typescript
// ✅ Use property shorthand
const name = "John";
const age = 30;
const user = { name, age }; // Instead of { name: name, age: age }

// ✅ Use method shorthand
const obj = {
  // ✅ Good
  getName() { return this.name; },
  
  // ❌ Avoid
  getName: function() { return this.name; }
};
```

### Spread Operator
```typescript
// ✅ Use spread for copying and merging
const newArray = [...oldArray, newItem];
const merged = { ...defaults, ...userConfig };

// ✅ Use rest for function parameters
function sum(...numbers: number[]) {
  return numbers.reduce((a, b) => a + b, 0);
}
```

### Early Returns
```typescript
// ✅ Use early returns to reduce nesting
function processUser(user: User | null) {
  if (!user) return null;
  if (!user.isActive) return null;
  
  return user.profile;
}

// ❌ Avoid deep nesting
function processUser(user: User | null) {
  if (user) {
    if (user.isActive) {
      return user.profile;
    }
  }
  return null;
}
```

### Avoid Magic Numbers
```typescript
// ✅ Use named constants
const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000;
const HTTP_OK = 200;

if (retries < MAX_RETRIES) { }

// ❌ Magic numbers
if (retries < 3) { }
setTimeout(callback, 5000);
```

### Type Annotations (TypeScript)
```typescript
// ✅ Explicit return types for public APIs
export function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ Let TypeScript infer for simple cases
const count = 5; // inferred as number
const name = "John"; // inferred as string

// ✅ Use type guards
function isUser(value: unknown): value is User {
  return typeof value === "object" && value !== null && "id" in value;
}
```

### Console & Debugging
```typescript
// ✅ Use structured logging in production
logger.info("User logged in", { userId, timestamp });

// ❌ Avoid console.log in production code
console.log("User:", user); // Remove before commit

// ✅ Use console methods appropriately
console.error("Error:", error); // For errors
console.warn("Deprecated API"); // For warnings
console.table(users); // For arrays/objects in dev
```

### Error Handling
```typescript
// ✅ Create custom error classes
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ✅ Always handle errors
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof ApiError) {
    // Handle API errors
  } else {
    // Handle unknown errors
    logger.error("Unexpected error", error);
  }
}

// ✅ Use Error objects, not strings
throw new Error("Something went wrong"); // ✅
throw "Something went wrong"; // ❌
```

### Avoid Nested Ternaries
```typescript
// ❌ Hard to read
const status = user.isActive 
  ? user.isPremium 
    ? "premium" 
    : "active" 
  : "inactive";

// ✅ Use if-else or function
function getUserStatus(user: User) {
  if (!user.isActive) return "inactive";
  if (user.isPremium) return "premium";
  return "active";
}
```

### Immutability
```typescript
// ✅ Don't mutate objects directly
const updatedUser = { ...user, name: "New Name" };

// ❌ Avoid mutations
user.name = "New Name"; // Mutates original

// ✅ Don't mutate arrays
const newItems = [...items, newItem];
const filtered = items.filter(item => item.active);

// ❌ Avoid mutations
items.push(newItem); // Mutates original
```

---

## TypeScript Best Practices

### Type Definitions
```typescript
// Use interfaces for object shapes
interface User {
  id: string;
  email: string;
  role: string;
}

// Use types for unions, intersections, primitives
type Status = "draft" | "published";
type ButtonVariant = "primary" | "secondary" | "danger";

// Use enums sparingly, prefer string unions
type UserRole = "admin" | "editor" | "viewer"; // ✅ Good
enum UserRole { Admin, Editor, Viewer } // ❌ Avoid
```

### Optional Properties
```typescript
// Use optional chaining and nullish coalescing
const userName = user?.name ?? "Guest";

// Avoid unnecessary type assertions
const value = data as string; // ❌ Risky
const value: string | undefined = data; // ✅ Better
```

---

## React Patterns

### Component Props
```typescript
// Always define prop interfaces
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  isDisabled?: boolean;
  variant?: "primary" | "secondary";
}

// Use destructuring with defaults
export function Button({ 
  children, 
  onClick, 
  isDisabled = false,
  variant = "primary" 
}: ButtonProps) {
  // ...
}
```

### State Management
```typescript
// Group related state into objects
// ❌ Bad
const [title, setTitle] = useState("");
const [slug, setSlug] = useState("");
const [content, setContent] = useState("");

// ✅ Good
const [formData, setFormData] = useState({
  title: "",
  slug: "",
  content: "",
});
```

### Event Handlers
```typescript
// Prefix with "handle" for event handlers
const handleClick = () => { /* ... */ };
const handleSubmit = (e: FormEvent) => { /* ... */ };
const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => { /* ... */ };
```

---

## API Conventions

### Error Handling
```typescript
// Use try-catch with specific error types
try {
  const data = await apiFetch("/endpoint");
  return data;
} catch (err) {
  if (err instanceof ApiError) {
    showToast({ message: err.message, type: "error" });
  } else {
    showToast({ message: "Unknown error occurred", type: "error" });
  }
}
```

### Function Parameters
```typescript
// Use object parameters for multiple arguments
// ❌ Bad (positional arguments)
showToast("Success message", "success", 5000);

// ✅ Good (object-based parameters)
showToast({ 
  message: "Success message", 
  type: "success",
  duration: 5000 
});
```

### Response Structure
```typescript
// Consistent API response format
interface ApiResponse<T = any> {
  status: "success" | "error";
  message?: string;
  data?: T;
}
```

---

## Data Fetching Patterns

### useApiQuery (Standard Queries)
```typescript
// Basic usage
const { data, isLoading, error, refetch } = useApiQuery<User[]>("/users");

// With options
const { data } = useApiQuery<Post>(`/blog/${id}`, {
  enabled: !!id, // Conditional fetching
  revalidateOnFocus: false, // Disable revalidation on focus
  staleTime: 5000, // Cache for 5 seconds
});

// Parallel queries (automatic)
const { data: users } = useApiQuery<User[]>("/users");
const { data: roles } = useApiQuery<Role[]>("/roles");
const { data: posts } = useApiQuery<Post[]>("/blog");
```

### useApiPagination (Paginated Queries)
```typescript
// Basic pagination
const { 
  items, 
  meta, 
  page, 
  setPage, 
  nextPage, 
  prevPage,
  isLoading 
} = useApiPagination<Post>("/blog", {
  initialPage: 1,
  initialLimit: 10
});

// Pagination with filters
const [status, setStatus] = useState("published");
const { items, meta } = useApiPagination<Post>(
  `/blog?status=${status}`,
  { initialLimit: 20 }
);

// Backend response format
interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### useApiMutation (POST/PUT/DELETE)
```typescript
// Create mutation
const { trigger, isMutating } = useApiMutation<Post, CreatePostInput>({
  path: "/blog",
  method: "POST",
  onSuccess: (data) => {
    showToast({ message: "Post created!", type: "success" });
    refetch(); // Refetch list
  }
});

// Update mutation
const { trigger: updatePost } = useApiMutation<Post, UpdatePostInput>({
  path: `/blog/${id}`,
  method: "PUT"
});

// Delete mutation
const { trigger: deletePost } = useApiMutation({
  path: `/blog/${id}`,
  method: "DELETE"
});

// Usage
await trigger({ title: "New Post", content: "..." });
```

---

## UI/UX Patterns

### Loading States
```typescript
// Use Loading component with isFullScreen
if (isLoading) {
  return <Loading isFullScreen />;
}

// Or with custom text
return <Loading text="Loading data..." />;
```

### Toast Notifications
```typescript
// Always use object-based API
showToast({ message: "Post created", type: "success" });
showToast({ message: "Failed to save", type: "error" });
showToast({ message: "Please confirm", type: "warning" });
```

### Form Labels
```typescript
// Use CamelCase (not UPPERCASE)
<label>Email Address</label> // ✅
<label>EMAIL ADDRESS</label> // ❌
```

### Button States
```typescript
// Boolean props with "is" prefix
<Button isDisabled={isSaving} isLoading={isRefreshing}>
  Save Changes
</Button>
```

---

## Database & Backend

### MongoDB ObjectId
```typescript
// Always serialize ObjectId to string in API responses
const posts = await collection.find().toArray();
const serialized = posts.map(post => ({
  ...post,
  _id: post._id.toString(), // ✅ Convert to string
}));
```

### Route Parameters
```typescript
// Support both ID and slug in GET endpoints
async function getItem(idOrSlug: string) {
  let item;
  
  // Try as ObjectId first
  try {
    const objectId = new ObjectId(idOrSlug);
    item = await collection.findOne({ _id: objectId });
  } catch (err) {
    // Not a valid ObjectId, try as slug
    item = await collection.findOne({ slug: idOrSlug });
  }
  
  if (!item) {
    reply.status(404).send({ status: "error", message: "Not found" });
    return;
  }
  
  return item;
}
```

### API Endpoints
- Admin operations: Use ID-based routes (`/blog/:id`)
- Public frontend: Support slug-based routes (`/blog/:slug`)
- List endpoints: Return arrays with metadata (total, page, limit)
- Detail endpoints: Return single object
- Create/Update: Return the created/updated object
- Delete: Return success message only

---

## Code Organization

### File Structure
```
src/
  ├── app/                 # Next.js pages
  ├── components/
  │   ├── ui/             # Reusable UI components
  │   └── forms/          # Form-specific components
  ├── lib/                # Utility functions
  └── types/              # TypeScript type definitions
```

### Import Order
```typescript
// 1. External libraries
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Internal utilities
import { apiFetch } from "@/lib/api";
import { useToast } from "@/lib/toast";

// 3. Components
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

// 4. Types
import type { User } from "@/types";
```

---

## Git Workflow

### Commit Messages
- Use present tense: "Add feature" not "Added feature"
- Be descriptive but concise
- Reference issue numbers when applicable

### Branch Strategy
- Never push directly to `main` or `master`
- Create feature branches: `feature/plugin-system`
- Use descriptive branch names

---

## Testing (When Implemented)

### Test Naming
```typescript
describe("Button component", () => {
  it("should render children correctly", () => {
    // ...
  });
  
  it("should be disabled when isDisabled is true", () => {
    // ...
  });
});
```

---

## Documentation

### JSDoc Comments
```typescript
/**
 * Fetches data from the API endpoint
 * @param url - API endpoint URL
 * @param options - Fetch options including method, headers, body
 * @returns Promise with parsed JSON response
 * @throws {ApiError} When the request fails
 * 
 * @example
 * const data = await apiFetch("/users", { method: "GET" });
 */
export async function apiFetch(url: string, options?: RequestInit) {
  // ...
}
```

### Component Documentation
```typescript
/**
 * Loading spinner component with optional text and full-screen mode
 * 
 * @example
 * // Full screen loading
 * <Loading isFullScreen />
 * 
 * @example
 * // Loading with custom text
 * <Loading text="Loading posts..." />
 * 
 * @example
 * // Small inline spinner
 * <Loading size="sm" />
 */
export function Loading({ size, text, isFullScreen }: LoadingProps) {
  // ...
}
```

---

## Plugin & Architecture Patterns

### 1. Dynamic RBAC Authorization
- Do **NOT** use simple "JWT exists" checks to authorize admin-level read/write pages.
- Use explicit **permission-based checks** (e.g. verifying if the user has `pages:write` permission inside the token payload) before serving admin-only data structure.
- Always use a centralized helper or route decorator to keep authentication logic DRY.

### 2. Loose Coupling via Event Bus (Observer Pattern)
- Plugins must **NEVER** import modules directly from other plugins (no cross-plugin local imports).
- Use the core `HookManager` (Event Bus) to communicate across modules:
  - **Trigger events:** Emit events when actions occur (e.g. `hooks.emit("form.submitted", data)`).
  - **React to events:** Separate plugins (like email or webhook loggers) should register observers (`hooks.on("form.submitted", callback)`) to react.

### 3. Frontend Query Abstraction (Strategy / Adapter Pattern)
- **NEVER** import `useSWR`, `@tanstack/react-query` or similar libraries directly inside page or layout components.
- All data fetching goes through two unified hooks: **`useApiQuery`** (reads) and **`useApiMutation`** (writes).
- Components always import from `@/hooks/useApi` — never from the adapter files directly.

#### Hook file structure:
```
admin/src/hooks/
  types.ts           ← library-agnostic common interfaces
  adapters/
    swr.ts           ← SWR implementation (active)
    tanstack.ts      ← TanStack Query implementation (ready to swap in)
  useApi.ts          ← single re-export line that picks the active adapter
```

#### Switching adapters (one line change in `useApi.ts`):
```typescript
// SWR (current):
export { useApiQuery, useApiMutation } from "./adapters/swr";

// TanStack Query:
export { useApiQuery, useApiMutation } from "./adapters/tanstack";
// Also requires: npm install @tanstack/react-query + QueryClientProvider in layout.tsx
```

#### Common hook options (`ApiQueryOptions`):
| Option | Type | Default | SWR maps to | TanStack maps to |
|---|---|---|---|---|
| `enabled` | `boolean` | `true` | `null` key | `enabled` |
| `revalidateOnFocus` | `boolean` | `true` | `revalidateOnFocus` | `refetchOnWindowFocus` |
| `retryOnError` | `boolean` | `false` | `shouldRetryOnError` | `retry` |
| `staleTime` | `number` (ms) | `0` | `dedupingInterval` | `staleTime` |

#### Return shape (`ApiQueryResult<T>`):
```typescript
{
  data: T | undefined;
  error: unknown;
  isLoading: boolean;     // true only on initial fetch (no cache)
  isRefreshing: boolean;  // true during background revalidation
  refetch: () => void;    // manually trigger revalidation
}
```

### 4. SWR-Specific Rules
- `revalidateOnFocus: true` is the default for all `useApiQuery` calls — this is the primary mechanism for keeping sidebar menus and shared state in sync without custom browser events.
- Do **NOT** use `window.dispatchEvent(new Event(...))` for cross-component data sync after migrating to `useApiQuery`. Use `refetch()` or let SWR handle focus-based revalidation.
- Use `isRefreshing` (not `isLoading`) to show spinner on refresh button clicks — `isLoading` is only `true` on the very first load when there is no cached data.
- **Never pass `undefined` callbacks to SWR options.** SWR throws `currentConfig.onError is not a function` if `onSuccess` or `onError` are `undefined`. Always use conditional spread:
  ```typescript
  // ✅ Correct
  ...(onSuccess && { onSuccess }),
  ...(onError && { onError }),

  // ❌ Wrong — throws when callbacks are undefined
  onSuccess,
  onError,
  ```

---

## Common Pitfalls to Avoid

1. **DELETE requests with Content-Type header but no body**
   - Only set Content-Type when body exists

2. **Non-serialized MongoDB ObjectId**
   - Always call `.toString()` before sending to client

3. **Inconsistent boolean prop naming**
   - Always use `is`/`has`/`can`/`should` prefix

4. **Hardcoded navigation**
   - Use plugin system for dynamic navigation

5. **Individual state variables for forms**
   - Use single `formData` object

6. **Positional function arguments**
   - Use object-based parameters for clarity

7. **Missing error handling**
   - Always wrap async operations in try-catch

---

## Version History

### 1.2.0 (June 21, 2026)
- Expanded Frontend Query Abstraction section with full adapter structure and option mapping table
- Finalized hook names: `useApiQuery` and `useApiMutation`
- Documented SWR-specific rules: `revalidateOnFocus`, `isRefreshing` vs `isLoading`, no custom browser events after SWR migration

### 1.1.0 (June 21, 2026)
- Added Plugin & Architecture Patterns section
- Defined Dynamic RBAC standards, Event Bus decoupling, and Frontend Query Adapter patterns

### 1.0.0 (June 20, 2026)
- Initial coding standards document
- Established naming conventions
- Defined React patterns
- API best practices
- Database conventions
