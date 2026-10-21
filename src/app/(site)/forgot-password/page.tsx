import { AuthShell } from "@/components/AuthShell";
import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "忘記密碼" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="忘記密碼" lead="輸入註冊時的 email，我們會寄一封重設密碼的信給你。">
      <ForgotForm />
    </AuthShell>
  );
}
