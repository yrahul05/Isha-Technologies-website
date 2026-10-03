/**
 * What clients may *request* to change (never change directly). Anything
 * not listed here cannot be requested at all.
 */
export const CHANGEABLE: Record<'client' | 'invoice' | 'project' | 'document' | 'task', Record<string, string>> = {
  client: {
    companyName: 'Company name',
    legalName: 'Legal name',
    contactName: 'Primary contact',
    email: 'Billing / contact email',
    phone: 'Phone',
    addressLine1: 'Address line 1',
    addressLine2: 'Address line 2',
    city: 'City',
    state: 'State',
    postalCode: 'Postal code',
    gstin: 'GSTIN',
    pan: 'PAN',
  },
  invoice: {
    billingName: 'Billing name on invoice',
    billingAddress: 'Billing address on invoice',
    billingGstin: 'GSTIN on invoice',
  },
  project: {
    description: 'Project description / scope',
    dueDate: 'Expected completion date',
  },
  document: {
    name: 'Document name',
    delete: 'Remove this document',
  },
  // Approved work (tasks shared with the client): meaningful changes need approval.
  task: {
    title: 'Task title',
    description: 'Task details / scope',
    dueDate: 'Due date',
  },
};

export const ENTITY_LABELS = { client: 'Company information', invoice: 'Invoice', project: 'Project', document: 'Document', task: 'Task' } as const;
