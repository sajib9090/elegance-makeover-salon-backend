import express from "express";
import { isLoggedIn, isSuperAdmin } from "../middlewares/authUser.js";
import {
  handleChangePasswordByAuthority,
  handleEditBrandInfo,
  handleEditUserInfo,
  handleForgotPassword,
  handleGetSingleUser,
  handleGetUsers,
  handleLoginUser,
  handleRefreshToken,
  handleRegisterUser,
  handleRemoveUserByAuthority,
} from "../controllers/usersController.js";
import {
  handleCreateCategory,
  handleDeleteCategory,
  handleGetCategories,
} from "../controllers/categoryControllers.js";
import {
  handleCreateService,
  handleDeleteService,
  handleGetServices,
} from "../controllers/serviceControllers.js";
import {
  handleCreateEmployee,
  handleGetEmployee,
  handleGetEmployees,
  handleHandleAddAdvanceSalary,
  handleRemoveEmployee,
  handleRemoveEmployeeAdvance,
} from "../controllers/employeeControllers.js";
import {
  handleCreateTempCustomer,
  handleDeleteTemporaryCustomerById,
  handleGetTemporaryCustomerById,
  handleGetTemporaryCustomers,
  handleMarkedAsPaid,
} from "../controllers/tempCustomerControllers.js";
import {
  handleChangeOrderLogQuantity,
  handleCreateTempOrderLog,
  handleDeleteSingleOrderLog,
  handleGetOrderLogById,
} from "../controllers/tempOrderLogControllers.js";
import {
  handleCreateSoldInvoice,
  handleGetInvoiceById,
  handleGetInvoicesByDate,
} from "../controllers/soldInvoicesControllers.js";
import {
  handleAddExpense,
  handleGetExpensesByDate,
  handleRemoveExpense,
} from "../controllers/expenseControllers.js";
import {
  categoryCreationLimiter,
  employeeCreationLimiter,
  expenseCreationLimiter,
  serviceCreationLimiter,
  soldInvoiceCreationLimiter,
  temCustomerCreationLimiter,
  temOrderLogCreationLimiter,
  userCreationLimiter,
  userForgotPasswordLimiter,
  userLoggedInLimiter,
} from "../rateLimiter/rateLimiter.js";

export const apiRouter = express.Router();

apiRouter.post(
  "/users/created-user",
  userCreationLimiter,
  isLoggedIn,
  isSuperAdmin,
  handleRegisterUser
);
apiRouter.get("/users", isLoggedIn, isSuperAdmin, handleGetUsers);
apiRouter.get("/users/user/:id", isLoggedIn, isSuperAdmin, handleGetSingleUser);
apiRouter.post("/users/auth-user-login", userLoggedInLimiter, handleLoginUser);
apiRouter.get("/users/auth-manage-token", handleRefreshToken);
apiRouter.patch(
  "/users/password-change-by-authority/:id",
  isLoggedIn,
  isSuperAdmin,
  handleChangePasswordByAuthority
);
apiRouter.delete(
  "/users/delete-user-by-authority/:id",
  isLoggedIn,
  isSuperAdmin,
  handleRemoveUserByAuthority
);
apiRouter.patch("/users/edit-brand-info", isLoggedIn, handleEditBrandInfo);
apiRouter.patch("/users/edit-user-info", isLoggedIn, handleEditUserInfo);
apiRouter.patch(
  "/users/forgot-password/:mobile",
  userForgotPasswordLimiter,
  isLoggedIn,
  handleForgotPassword
);

//categories
apiRouter.post(
  "/categories/category-create",
  categoryCreationLimiter,
  isLoggedIn,
  handleCreateCategory
);
apiRouter.get("/categories", isLoggedIn, handleGetCategories);
apiRouter.delete(
  "/categories/delete/:categoryId",
  isLoggedIn,
  handleDeleteCategory
);

//services
apiRouter.post(
  "/services/service-create",
  serviceCreationLimiter,
  isLoggedIn,
  handleCreateService
);
apiRouter.get("/services", isLoggedIn, handleGetServices);
apiRouter.delete(
  "/services/delete/:serviceId",
  isLoggedIn,
  handleDeleteService
);

//employees
apiRouter.post(
  "/employees/employee-create",
  employeeCreationLimiter,
  isLoggedIn,
  handleCreateEmployee
);
apiRouter.post(
  "/employees/employee-advance-salary/:employeeId",
  isLoggedIn,
  handleHandleAddAdvanceSalary
);
apiRouter.get("/employees", isLoggedIn, handleGetEmployees);
apiRouter.get("/employees/employee/:employeeId", isLoggedIn, handleGetEmployee);
apiRouter.delete(
  "/employees/delete/:employeeId",
  isLoggedIn,
  handleRemoveEmployee
);
apiRouter.delete(
  "/employees/delete-advance-salary/:employeeId",
  isLoggedIn,
  handleRemoveEmployeeAdvance
);

//temporary customer
apiRouter.post(
  "/temp-customers/temp-customer-create",
  temCustomerCreationLimiter,
  isLoggedIn,
  handleCreateTempCustomer
);
apiRouter.get("/temp-customers", isLoggedIn, handleGetTemporaryCustomers);
apiRouter.get(
  "/temp-customers/get-single/:id",
  isLoggedIn,
  handleGetTemporaryCustomerById
);
apiRouter.delete(
  "/temp-customers/delete/:tempId",
  isLoggedIn,
  handleDeleteTemporaryCustomerById
);
apiRouter.patch(
  "/temp-customers/marked-as-paid/:tempId",
  isLoggedIn,
  handleMarkedAsPaid
);

//temporary order log
apiRouter.post(
  "/temp-orders-log/temp-order-log-create",
  temOrderLogCreationLimiter,
  isLoggedIn,
  handleCreateTempOrderLog
);
apiRouter.get(
  "/temp-orders-logs/temp-order/:tempCustomerId",
  isLoggedIn,
  handleGetOrderLogById
);
apiRouter.patch(
  "/temp-orders-logs/temp-order-quantity-change/:tempOrderLogId",
  isLoggedIn,
  handleChangeOrderLogQuantity
);
apiRouter.delete(
  "/temp-orders-logs/temp-order-delete/:id",
  isLoggedIn,
  handleDeleteSingleOrderLog
);

//sold invoice
apiRouter.post(
  "/sold-invoices/sold-invoice-create",
  soldInvoiceCreationLimiter,
  isLoggedIn,
  handleCreateSoldInvoice
);
apiRouter.get(
  "/sold-invoices/sold-invoice/:id",
  isLoggedIn,
  handleGetInvoiceById
);
apiRouter.get("/sold-invoices", isLoggedIn, handleGetInvoicesByDate);

//expense
apiRouter.post(
  "/expenses/add-expense",
  expenseCreationLimiter,
  isLoggedIn,
  handleAddExpense
);
apiRouter.get("/expenses", isLoggedIn, handleGetExpensesByDate);
apiRouter.delete(
  "/expenses/delete-expense/:expenseId",
  isLoggedIn,
  handleRemoveExpense
);
