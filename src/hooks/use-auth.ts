import { useContext } from "react";
import { AuthContext } from "@/context/auth-context-state";

export const useAuth = () => useContext(AuthContext);
