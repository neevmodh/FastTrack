export type OnuStatus =
  | "IN_STOCK"
  | "ASSIGNED"
  | "INSTALLED"
  | "FAULTY"
  | "RETURNED";

export type Role = "STAFF" | "OFFICE" | "ADMIN";

export type Onu = {
  id: string;
  companyName: string;
  macAddress: string;
  serialNumber?: string | null;
  ponSerial?: string | null;
  model?: string | null;
  photoUrl?: string | null;
  status: OnuStatus;
  ipAddress?: string | null;
  notes?: string | null;
  createdAt: string;
  addedBy?: { id: string; name: string } | null;
  assignedTo?: { id: string; name: string } | null;
  installation?: {
    id: string;
    customerName?: string | null;
    customerAddress?: string | null;
    installedAt: string;
    manualOverride: boolean;
  } | null;
};

export type AppUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  active: boolean;
  assignedIp?: string | null;
  createdAt: string;
};

export type Complaint = {
  id: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  onu: { id: string; companyName: string; macAddress: string };
  reportedBy: { id: string; name: string };
};

export type AuditLogEntry = {
  id: string;
  action: string;
  details?: string | null;
  createdAt: string;
  user?: { id: string; name: string; role: Role } | null;
};
