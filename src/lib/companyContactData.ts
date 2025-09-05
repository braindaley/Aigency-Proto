// Company contact data override
// This file provides contact information that may not be extractable from PDFs

export const companyContactData: Record<string, any> = {
  '9TqeywGbUh5nHSmYpzYe': {
    companyName: 'TWR Enterprises, Inc',
    primaryContact: 'Brian Daley',
    phone: '555-1234',  // Update with actual phone number you see
    email: 'brian@twrenterprises.com',  // Update with actual email
    address: {
      street: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94105'
    },
    fein: '12-3456789',
    website: 'https://www.twrenterprises.com'
  }
};

export function getCompanyContact(companyId: string) {
  return companyContactData[companyId] || null;
}