-- Performance indexes for fields filtered/joined on at scale
-- (Onu.status, Onu.assignedToId for stock filtering; Installation FKs for
-- joins; AuditLog entity lookups and date-range filters; Customer createdAt
-- for stable pagination ordering).
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");
CREATE INDEX "Installation_customerId_idx" ON "Installation"("customerId");
CREATE INDEX "Installation_staffId_idx" ON "Installation"("staffId");
CREATE INDEX "Onu_status_idx" ON "Onu"("status");
CREATE INDEX "Onu_assignedToId_idx" ON "Onu"("assignedToId");
CREATE INDEX "Onu_createdAt_idx" ON "Onu"("createdAt");
