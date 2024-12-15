import express from "express";
import { isLoggedIn, isSuperAdmin } from "../middlewares/authUser.js";
import {
  handleGetUsers,
  handleLoginUser,
  handleRefreshToken,
  handleRegisterUser,
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
  handleGetEmployees,
  handleRemoveEmployee,
} from "../controllers/employeeControllers.js";
import {
  handleCreateTempCustomer,
  handleDeleteTemporaryCustomerById,
  handleGetTemporaryCustomerById,
  handleGetTemporaryCustomers,
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

export const apiRouter = express.Router();

apiRouter.post(
  "/users/created-user",
  isLoggedIn,
  isSuperAdmin,
  handleRegisterUser
);
apiRouter.get("/users", isLoggedIn, isSuperAdmin, handleGetUsers);
apiRouter.post("/users/auth-user-login", handleLoginUser);
apiRouter.get("/users/auth-manage-token", handleRefreshToken);

//categories
apiRouter.post("/categories/category-create", isLoggedIn, handleCreateCategory);
apiRouter.get("/categories", isLoggedIn, handleGetCategories);
apiRouter.delete(
  "/categories/delete/:categoryId",
  isLoggedIn,
  handleDeleteCategory
);

//services
apiRouter.post("/services/service-create", isLoggedIn, handleCreateService);
apiRouter.get("/services", isLoggedIn, handleGetServices);
apiRouter.delete(
  "/services/delete/:serviceId",
  isLoggedIn,
  handleDeleteService
);

//employees
apiRouter.post("/employees/employee-create", isLoggedIn, handleCreateEmployee);
apiRouter.get("/employees", isLoggedIn, handleGetEmployees);
apiRouter.delete(
  "/employees/delete/:employeeId",
  isLoggedIn,
  handleRemoveEmployee
);

//temporary customer
apiRouter.post(
  "/temp-customers/temp-customer-create",
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

//temporary order log
apiRouter.post(
  "/temp-orders-log/temp-order-log-create",
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
  isLoggedIn,
  handleCreateSoldInvoice
);
apiRouter.get(
  "/sold-invoices/sold-invoice/:id",
  isLoggedIn,
  handleGetInvoiceById
);

apiRouter.get("/sold-invoices", isLoggedIn, handleGetInvoicesByDate);
