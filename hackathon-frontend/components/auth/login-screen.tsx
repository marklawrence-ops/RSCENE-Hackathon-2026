"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthUser } from "@/lib/auth";
import { LoginCard } from "./login-card";

/** /login: sign in, then go to the Program Designer (or straight there if already signed in). */
export function LoginScreen() {
  const router = useRouter();
  const user = useAuthUser();

  useEffect(() => {
    if (user) router.replace("/designer");
  }, [user, router]);

  return <LoginCard />;
}
