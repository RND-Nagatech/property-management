import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { clearAuthToken } from "@/services/auth";

export const Route = createFileRoute("/logout")({
  component: Logout,
});

function Logout() {
  const navigate = useNavigate();
  useEffect(() => {
    clearAuthToken();
    navigate({ to: "/" });
  }, [navigate]);
  return null;
}
