export interface BikeModel {
  id: string;
  name: string;
  tvs_category: "2W" | "3W";
  bike_category: "scooter" | "motorbike" | "moped" | "3w";
  fuel_type: "petrol" | "electric" | "diesel";
  mrp: number;
  default_discount: number;
  selling_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  bike_colors?: BikeColor[];
  bike_variants?: BikeVariant[];
}

export interface BikeVariant {
  id: string;
  model_id: string;
  name: string;
  mrp: number;
  selling_price: number;
  is_active: boolean;
}

export interface BikeColor {
  id: string;
  model_id: string;
  name: string;
  hex_code?: string;
  is_active: boolean;
}

export interface InventoryBike {
  id: string;
  round_number: string;
  chassis_number: string;
  engine_number: string;
  model_id: string;
  variant_id?: string;
  color_id?: string;
  status: "in_stock" | "sold" | "transferred" | "reserved";
  purchase_price: number;
  selling_price: number;
  stock_date: string;
  notes?: string;
  created_at: string;
  // Joined
  bike_models?: BikeModel;
  bike_variants?: BikeVariant;
  bike_colors?: BikeColor;
}

export interface Customer {
  id: string;
  full_name: string;
  phone?: string;
  phone2?: string;
  nic?: string;
  address?: string;
  email?: string;
  notes?: string;
  created_at: string;
}

export interface Employee {
  id: string;
  profile_id?: string;
  employee_code?: string;
  full_name: string;
  phone?: string;
  nic?: string;
  address?: string;
  email?: string;
  type: "director" | "worker";
  department?: string;
  designation?: string;
  basic_salary: number;
  join_date?: string;
  is_active: boolean;
}

export interface Sale {
  id: string;
  invoice_number: string;
  sale_date: string;
  bike_id: string;
  customer_id: string;
  sold_by?: string;
  selling_price: number;
  discount: number;
  total_amount: number;
  payment_type: "cash" | "finance";
  finance_company_id?: string;
  loan_amount?: number;
  approved_amount?: number;
  finance_commission?: number;
  customer_downpayment?: number;
  insurance_company_id?: string;
  insurance_amount?: number;
  insurance_commission?: number;
  tvs_commission?: number;
  status: "completed" | "cancelled" | "pending";
  notes?: string;
  created_at: string;
  // Joined
  inventory_bikes?: InventoryBike;
  customers?: Customer;
}

export interface Cheque {
  id: string;
  type: "tvs" | "other";
  cheque_number: string;
  description?: string;
  pay_to?: string;
  issue_date?: string;
  payment_date?: string;
  amount: number;
  bank?: string;
  status: "pending" | "successful" | "returned";
  notes?: string;
}

export interface Expense {
  id: string;
  category: "rent" | "utilities" | "salary" | "broker_commission" | "bonus" | "petty_cash" | "ridermo_payment" | "other";
  description: string;
  amount: number;
  expense_date: string;
  notes?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message?: string;
  type: "info" | "warning" | "success" | "error";
  is_read: boolean;
  link?: string;
  created_at: string;
}
