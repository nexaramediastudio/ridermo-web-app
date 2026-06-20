import {
  LayoutDashboard, ShoppingCart, Package, Users, UserCog,
  Landmark, BarChart3, Settings, TrendingUp,
  Bike, Car, Wrench, Puzzle, Receipt, FileText,
  UserCheck, Calendar, ClipboardList, DollarSign,
  CreditCard, Wallet, Hash, FolderOpen,
} from "lucide-react";
import type { AppRole } from "./roles";
import { hasFullAccess } from "./roles";

export interface NavChild { label: string; href: string; icon: React.ElementType; }
export interface NavItem { label: string; href?: string; icon: React.ElementType; children?: NavChild[]; }

const FULL_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", icon: Package, children: [
    { label: "TVS Bikes", href: "/inventory/bikes", icon: Bike },
    { label: "Used Bikes", href: "/used-bikes", icon: Car },
    { label: "Spare Parts", href: "/spare-parts", icon: Wrench },
    { label: "Accessories", href: "/accessories", icon: Puzzle },
  ]},
  { label: "Sales", icon: ShoppingCart, children: [
    { label: "New Sale", href: "/sales/new", icon: ShoppingCart },
    { label: "Sales History", href: "/sales", icon: Receipt },
    { label: "Invoices", href: "/sales/invoices", icon: FileText },
  ]},
  { label: "Customers", icon: Users, children: [
    { label: "All Customers", href: "/customers", icon: Users },
    { label: "CR & Plates", href: "/cr-plates", icon: Hash },
  ]},
  { label: "HR", icon: UserCog, children: [
    { label: "Employees", href: "/hr/employees", icon: UserCheck },
    { label: "Attendance", href: "/hr/attendance", icon: Calendar },
    { label: "Leave", href: "/hr/leave", icon: ClipboardList },
    { label: "Payroll", href: "/hr/payroll", icon: DollarSign },
    { label: "Payslips", href: "/hr/payslips", icon: Receipt },
  ]},
  { label: "Finance", icon: Landmark, children: [
    { label: "Overview", href: "/finance", icon: Landmark },
    { label: "Income", href: "/income", icon: TrendingUp },
    { label: "TVS Cheques", href: "/cheques/tvs", icon: CreditCard },
    { label: "Other Cheques", href: "/cheques/other", icon: Wallet },
    { label: "Expenses", href: "/expenses", icon: Wallet },
  ]},
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Documents", href: "/documents", icon: FolderOpen },
  { label: "Settings", href: "/settings", icon: Settings },
];

const WORKER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", icon: Package, children: [
    { label: "TVS Bikes", href: "/inventory/bikes", icon: Bike },
    { label: "Used Bikes", href: "/used-bikes", icon: Car },
    { label: "Spare Parts", href: "/spare-parts", icon: Wrench },
    { label: "Accessories", href: "/accessories", icon: Puzzle },
  ]},
  { label: "Sales", icon: ShoppingCart, children: [
    { label: "New Sale", href: "/sales/new", icon: ShoppingCart },
    { label: "Sales History", href: "/sales", icon: Receipt },
    { label: "Invoices", href: "/sales/invoices", icon: FileText },
  ]},
  { label: "Customers", icon: Users, children: [
    { label: "All Customers", href: "/customers", icon: Users },
    { label: "CR & Plates", href: "/cr-plates", icon: Hash },
  ]},
  { label: "Attendance", href: "/hr/attendance", icon: Calendar },
  { label: "My Commissions", href: "/worker/commissions", icon: DollarSign },
];

const ACCOUNTANT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Finance", icon: Landmark, children: [
    { label: "Overview", href: "/finance", icon: Landmark },
    { label: "Income", href: "/income", icon: TrendingUp },
    { label: "TVS Cheques", href: "/cheques/tvs", icon: CreditCard },
    { label: "Other Cheques", href: "/cheques/other", icon: Wallet },
    { label: "Expenses", href: "/expenses", icon: Wallet },
  ]},
  { label: "HR", icon: UserCog, children: [
    { label: "Employees", href: "/hr/employees", icon: UserCheck },
    { label: "Payroll", href: "/hr/payroll", icon: DollarSign },
    { label: "Payslips", href: "/hr/payslips", icon: Receipt },
    { label: "Leave", href: "/hr/leave", icon: ClipboardList },
  ]},
  { label: "Sales", icon: ShoppingCart, children: [
    { label: "Sales History", href: "/sales", icon: Receipt },
    { label: "Invoices", href: "/sales/invoices", icon: FileText },
  ]},
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Documents", href: "/documents", icon: FolderOpen },
];

export function getNavForRole(role: AppRole): NavItem[] {
  if (hasFullAccess(role)) return FULL_NAV;
  if (role === "accountant") return ACCOUNTANT_NAV;
  return WORKER_NAV;
}
