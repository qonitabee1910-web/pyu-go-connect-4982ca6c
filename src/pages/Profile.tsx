import { lazy } from "react";

/**
 * Profile page - routes to user profile component
 * Handles user account settings and profile information
 */
const UserProfile = lazy(() => import("./user/UserProfile"));

export default function Profile() {
  return <UserProfile />;
}
