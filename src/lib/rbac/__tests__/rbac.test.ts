/**
 * RBAC Unit Tests
 * 
 * Tests for the core RBAC permission logic
 * Issue #45 - Team roles + permissions
 */

import { describe, it, expect } from "vitest"
import {
  hasPermission,
  checkPermission,
  assertPermission,
  PermissionError,
  getRolePermissions,
  isValidTeamRole,
  hasHigherOrEqualRole,
  getHighestRole,
  ROLE_HIERARCHY,
  PERMISSION_MATRIX,
  type TeamRole,
  type PermissionAction,
} from "../index"

describe("RBAC Core", () => {
  describe("hasPermission", () => {
    it("should allow admin to do everything", () => {
      const adminPermissions = PERMISSION_MATRIX["admin"]
      for (const permission of adminPermissions) {
        expect(hasPermission("admin", permission)).toBe(true)
      }
    })

    it("should allow viewer only view permissions", () => {
      const viewerPermissions = PERMISSION_MATRIX["viewer"]
      
      // Should have view permissions
      expect(hasPermission("viewer", "incident.view")).toBe(true)
      expect(hasPermission("viewer", "settings.view")).toBe(true)
      expect(hasPermission("viewer", "team.view")).toBe(true)
      
      // Should NOT have write permissions
      expect(hasPermission("viewer", "incident.create")).toBe(false)
      expect(hasPermission("viewer", "incident.update")).toBe(false)
      expect(hasPermission("viewer", "team.invite")).toBe(false)
      expect(hasPermission("viewer", "settings.manage")).toBe(false)
    })

    it("should allow editor incident management but not admin tasks", () => {
      // Editor CAN do these
      expect(hasPermission("editor", "incident.view")).toBe(true)
      expect(hasPermission("editor", "incident.create")).toBe(true)
      expect(hasPermission("editor", "incident.update")).toBe(true)
      expect(hasPermission("editor", "incident.post_update")).toBe(true)
      expect(hasPermission("editor", "incident.resolve")).toBe(true)
      
      // Editor CANNOT do these
      expect(hasPermission("editor", "incident.delete")).toBe(false)
      expect(hasPermission("editor", "team.invite")).toBe(false)
      expect(hasPermission("editor", "team.remove")).toBe(false)
      expect(hasPermission("editor", "team.update_role")).toBe(false)
      expect(hasPermission("editor", "settings.manage")).toBe(false)
      expect(hasPermission("editor", "integrations.manage")).toBe(false)
      expect(hasPermission("editor", "audit.view")).toBe(false)
    })

    it("should return false for invalid permission", () => {
      expect(hasPermission("admin", "invalid.permission" as PermissionAction)).toBe(false)
    })
  })

  describe("checkPermission", () => {
    it("should return true when user has permission", () => {
      expect(checkPermission("admin", "team.invite")).toBe(true)
      expect(checkPermission("editor", "incident.create")).toBe(true)
      expect(checkPermission("viewer", "incident.view")).toBe(true)
    })

    it("should return false when user lacks permission", () => {
      expect(checkPermission("viewer", "team.invite")).toBe(false)
      expect(checkPermission("editor", "team.remove")).toBe(false)
    })
  })

  describe("assertPermission", () => {
    it("should not throw when user has permission", () => {
      expect(() => assertPermission("admin", "team.invite")).not.toThrow()
      expect(() => assertPermission("editor", "incident.create")).not.toThrow()
    })

    it("should throw PermissionError when user lacks permission", () => {
      expect(() => assertPermission("viewer", "team.invite")).toThrow(PermissionError)
      expect(() => assertPermission("editor", "team.remove")).toThrow(PermissionError)
    })

    it("should include context in error message", () => {
      try {
        assertPermission("viewer", "team.invite", "trying to invite user")
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(PermissionError)
        expect((error as PermissionError).message).toContain("trying to invite user")
      }
    })
  })

  describe("getRolePermissions", () => {
    it("should return all permissions for a role", () => {
      const adminPerms = getRolePermissions("admin")
      expect(adminPerms).toContain("team.invite")
      expect(adminPerms).toContain("team.remove")
      expect(adminPerms).toContain("audit.view")

      const viewerPerms = getRolePermissions("viewer")
      expect(viewerPerms).toContain("incident.view")
      expect(viewerPerms).not.toContain("team.invite")
    })
  })

  describe("isValidTeamRole", () => {
    it("should validate correct roles", () => {
      expect(isValidTeamRole("admin")).toBe(true)
      expect(isValidTeamRole("editor")).toBe(true)
      expect(isValidTeamRole("viewer")).toBe(true)
    })

    it("should reject invalid roles", () => {
      expect(isValidTeamRole("owner")).toBe(false)
      expect(isValidTeamRole("member")).toBe(false)
      expect(isValidTeamRole("")).toBe(false)
      expect(isValidTeamRole("ADMIN")).toBe(false)
    })
  })

  describe("ROLE_HIERARCHY", () => {
    it("should have correct hierarchy values", () => {
      expect(ROLE_HIERARCHY["admin"]).toBe(3)
      expect(ROLE_HIERARCHY["editor"]).toBe(2)
      expect(ROLE_HIERARCHY["viewer"]).toBe(1)
    })

    it("should be ordered correctly", () => {
      expect(ROLE_HIERARCHY["admin"]).toBeGreaterThan(ROLE_HIERARCHY["editor"])
      expect(ROLE_HIERARCHY["editor"]).toBeGreaterThan(ROLE_HIERARCHY["viewer"])
    })
  })

  describe("hasHigherOrEqualRole", () => {
    it("should return true for same role", () => {
      expect(hasHigherOrEqualRole("admin", "admin")).toBe(true)
      expect(hasHigherOrEqualRole("editor", "editor")).toBe(true)
      expect(hasHigherOrEqualRole("viewer", "viewer")).toBe(true)
    })

    it("should return true for higher role", () => {
      expect(hasHigherOrEqualRole("admin", "editor")).toBe(true)
      expect(hasHigherOrEqualRole("admin", "viewer")).toBe(true)
      expect(hasHigherOrEqualRole("editor", "viewer")).toBe(true)
    })

    it("should return false for lower role", () => {
      expect(hasHigherOrEqualRole("editor", "admin")).toBe(false)
      expect(hasHigherOrEqualRole("viewer", "admin")).toBe(false)
      expect(hasHigherOrEqualRole("viewer", "editor")).toBe(false)
    })
  })

  describe("getHighestRole", () => {
    it("should return null for empty array", () => {
      expect(getHighestRole([])).toBeNull()
    })

    it("should return the only role for single element", () => {
      expect(getHighestRole(["viewer"])).toBe("viewer")
      expect(getHighestRole(["admin"])).toBe("admin")
    })

    it("should return highest role from array", () => {
      expect(getHighestRole(["viewer", "editor", "admin"])).toBe("admin")
      expect(getHighestRole(["viewer", "editor"])).toBe("editor")
      expect(getHighestRole(["admin", "viewer"])).toBe("admin")
    })
  })

  describe("PERMISSION_MATRIX completeness", () => {
    it("should have all defined permissions for admin", () => {
      const adminPerms = getRolePermissions("admin")
      
      // Team management
      expect(adminPerms).toContain("team.view")
      expect(adminPerms).toContain("team.invite")
      expect(adminPerms).toContain("team.remove")
      expect(adminPerms).toContain("team.update_role")

      // Incidents
      expect(adminPerms).toContain("incident.view")
      expect(adminPerms).toContain("incident.create")
      expect(adminPerms).toContain("incident.update")
      expect(adminPerms).toContain("incident.delete")
      expect(adminPerms).toContain("incident.post_update")
      expect(adminPerms).toContain("incident.resolve")

      // Settings
      expect(adminPerms).toContain("settings.view")
      expect(adminPerms).toContain("settings.manage")

      // Integrations
      expect(adminPerms).toContain("integrations.view")
      expect(adminPerms).toContain("integrations.manage")

      // Status pages
      expect(adminPerms).toContain("statuspage.view")
      expect(adminPerms).toContain("statuspage.manage")

      // Audit
      expect(adminPerms).toContain("audit.view")
    })

    it("should have consistent permissions across all roles", () => {
      const allPermissions: PermissionAction[] = [
        "team.view",
        "incident.view", 
        "settings.view",
        "integrations.view",
        "statuspage.view",
      ]

      // All roles should have basic view permissions
      for (const role of ["admin", "editor", "viewer"] as TeamRole[]) {
        for (const perm of allPermissions) {
          expect(hasPermission(role, perm)).toBe(true)
        }
      }
    })
  })
})
