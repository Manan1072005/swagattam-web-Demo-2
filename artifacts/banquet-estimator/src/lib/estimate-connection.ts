/** Shared payload types for estimates stored in Supabase. */

export type EstimateCustomer = {
  name: string;
  mobile: string;
  eventType: string;
  eventDate: string;
  guests: number;
  gstNumber: string;
  hall: string;
};

export type EstimateService = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  pricingType: 'perPerson' | 'fixed' | 'perUnit';
  quantity: number;
  unitPrice: number;
  total: number;
};

export type EstimatePayload = {
  reference: string;
  customer: EstimateCustomer;
  services: EstimateService[];
  pricing: {
    foodPerPlate: number;
    subtotal: number;
    gstEnabled: boolean;
    gstRate: number;
    gstAmount: number;
    gstNumber: string;
    gstNumberVisible: boolean;
    grandTotal: number;
    costPerGuest: number;
  };
};
