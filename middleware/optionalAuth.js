import { httpAuth } from "./wsAuth.middleware.js";

export const optionalAuth = (req, res, next) => {
  // Try to run httpAuth; if it fails due to no token, just continue
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return httpAuth(req, res, next); // validate token normally
  }
  next(); // no token, allow request to continue
};
