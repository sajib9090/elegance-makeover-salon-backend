import { client } from "../config/db.js";

const db_name = "Elegance-Makeover-salon";

export const usersCollection = client.db(db_name).collection("users");
export const brandsCollection = client.db(db_name).collection("brands");
export const categoriesCollection = client.db(db_name).collection("categories");
export const servicesCollection = client.db(db_name).collection("services");
export const employeesCollection = client.db(db_name).collection("employees");
export const customersCollection = client.db(db_name).collection("customers");
export const advanceSalariesCollection = client
  .db(db_name)
  .collection("advanceSalaries");
export const tempCustomersCollection = client
  .db(db_name)
  .collection("temp-customers");
export const tempOrderLogsCollection = client
  .db(db_name)
  .collection("temp-order-log");
export const soldInvoicesCollection = client
  .db(db_name)
  .collection("sold-Invoices");
