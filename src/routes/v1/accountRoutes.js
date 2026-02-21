import { Router } from "express";

import AccountController from "../../controllers/v1/accountController.js";
import authorization from "../../middlewares/authorization.js";
import authentication from "../../middlewares/authentication.js";

const accountRouter = new Router();
const account = new AccountController();

// Ensure that all endpoints implements authorization
// OAuth using Google Platform
accountRouter.get(
  "/oauth/google/redirect",
  account.oauthGoogleRedirect.bind(account),
);
accountRouter.get(
  "/oauth/google/callback",
  account.oauthGoogleCallback.bind(account),
);
accountRouter.post("/register", account.register.bind(account));
accountRouter.post("/login", account.login.bind(account));
accountRouter.use(authorization);

// accountRouter.post('/login', account.login.bind(account));
accountRouter.post("/", account.create.bind(account));
// accountRouter.get('/', authentication, account.profile.bind(account));

// accountRouter.get(
//   "/:account_id/spaces/invites",
//   account.get_all_space_invites_by_account_id.bind(account),
// );

accountRouter.post("/:account_id/space", account.create_space.bind(account));
accountRouter.get(
  "/:account_id/space/:space_id",
  account.get_space_by_id.bind(account),
);

export default accountRouter;
