import { redirect } from "next/navigation";

export default function Home() {
  // Will redirect to dashboard if authenticated, login if not
  // For now, redirect to login
  redirect("/login");
}
