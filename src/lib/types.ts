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
    customerIdText?: string | null;
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

export type InstallationRecord = {
  id: string;
  customerIdText?: string | null;
  manualOverride: boolean;
  notes?: string | null;
  installedAt: string;
  onu: {
    id: string;
    companyName: string;
    macAddress: string;
    model?: string | null;
    serialNumber?: string | null;
  };
};

export type UserDetail = {
  user: AppUser;
  installations: InstallationRecord[];
  currentlyAssigned: Onu[];
  complaints: Complaint[];
  addedOnusCount: number;
};

export type Customer = {
  id: string;
  customerId: string;
  createdAt: string;
  _count?: { installations: number };
};

export type OnuDetail = Omit<Onu, "installation" | "complaints"> & {
  ipAddress?: string | null;
  createdAt: string;
  updatedAt?: string;
  installation: {
    id: string;
    customerIdText?: string | null;
    manualOverride: boolean;
    notes?: string | null;
    installedAt: string;
    staff: { id: string; name: string };
    customer?: Customer | null;
  } | null;
  complaints: (Complaint & { reportedBy: { id: string; name: string } })[];
};
