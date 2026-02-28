# RBAC Specification - Team Roles & Permissions

**Issue:** #45  
**Status:** In Progress  
**Branch:** `feature/team-roles-permissions`

## Overview

Add role-based access control (RBAC) so teams can safely delegate incident updates. Roles gate incident creation/updates, component management, integrations, and org settings; viewers should be read-only in the admin UI.

## Roles

| Role | Description |
|------|-------------|
| `admin` | Full access including team management and settings |
| `editor` | Can create and manage incidents, post updates, resolve issues |
| `viewer` | Read-only access to dashboard and status pages |

## Permission Matrix

| Permission | Admin | Editor | Viewer |
|------------|-------|--------|--------|
| **Team Management** ||||
| `team.view` | ✅ | ✅ | ✅ |
| `team.invite` | ✅ | ❌ | ❌ |
| `team.remove` | ✅ | ❌ | ❌ |
| `team.update_role` | ✅ | ❌ | ❌ |
| **Incidents** ||||
| `incident.view` | ✅ | ✅ | ✅ |
| `incident.create` | ✅ | ✅ | ❌ |
| `incident.update` | ✅ | ✅ | ❌ |
| `incident.delete` | ✅ | ❌ | ❌ |
| `incident.post_update` | ✅ | ✅ | ❌ |
| `incident.resolve` | ✅ | ✅ | ❌ |
| **Settings** ||||
| `settings.view` | ✅ | ✅ | ✅ |
| `settings.manage` | ✅ | ❌ | ❌ |
| **Integrations** ||||
| `integrations.view` | ✅ | ✅ | ✅ |
| `integrations.manage` | ✅ | ❌ | ❌ |
| **Status Pages** ||||
| `statuspage.view` | ✅ | ✅ | ✅ |
| `statuspage.manage` | ✅ | ❌ | ❌ |
| **Audit** ||||
| `audit.view` | ✅ | ❌ | ❌ |

## Data Model

### UserRole
```prisma
model UserRole {
  id          String   @id @default(cuid())
  userId      String
  workspaceId String
  role        String   // admin | editor | viewer
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, workspaceId])
  @@index([workspaceId])
}
```

## API Endpoints

### `/api/rbac`
- `GET` - Get current user's role and permissions for workspace
- `POST` - Check specific permission

### `/api/rbac/team`
- `GET` - List team members with roles
- `POST` - Update member role (admin only)
- `DELETE` - Remove team member (admin only)

### `/api/rbac/invites`
- `GET` - List pending invites
- `POST` - Create invite (admin only)
- `DELETE` - Revoke invite (admin only)

### `/api/rbac/invites/accept`
- `POST` - Accept invite with token

### `/api/rbac/invites/validate`
- `GET` - Validate invite token (public)

## Client-Side Usage

```typescript
import { hasPermission, type TeamRole, type PermissionAction } from '@/lib/rbac';

// Check permission
const canEdit = hasPermission(userRole, 'incident.update');

// Use in component
if (hasPermission(role, 'incident.create')) {
  return <CreateIncidentButton />;
}
```

## Server-Side Usage

```typescript
import { requirePermission, getUserTeamRole } from '@/lib/rbac/server';

// In API route
await requirePermission(userId, workspaceId, 'incident.update');

// Or check manually
const role = await getUserTeamRole(userId, workspaceId);
```

## Migration Path

Existing workspace memberships map to team roles:
- `OWNER`/`ADMIN` → `admin`
- `MEMBER` → `editor` 
- `VIEWER` → `viewer`

The `UserRole` table stores explicit overrides. Falls back to workspace membership role if no explicit role exists.

## Testing Checklist

- [ ] Unit tests for permission matrix
- [ ] API route tests for all endpoints
- [ ] Permission enforcement in UI components
- [ ] Migration compatibility with existing data
- [ ] Invite flow end-to-end test
