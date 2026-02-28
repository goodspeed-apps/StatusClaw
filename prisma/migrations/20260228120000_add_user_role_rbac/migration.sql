-- Migration: Add UserRole table for RBAC (Issue #45)
-- Created: 2026-02-28

-- Create UserRoleType enum
CREATE TYPE "UserRoleType" AS ENUM ('ADMIN', 'EDITOR', 'VIEWER');

-- Create UserRole table
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "role" "UserRoleType" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- Create unique index for user-workspace combination
CREATE UNIQUE INDEX "UserRole_userId_workspaceId_key" ON "UserRole"("userId", "workspaceId");

-- Create indexes for common queries
CREATE INDEX "UserRole_workspaceId_idx" ON "UserRole"("workspaceId");
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- Add foreign key constraints
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
