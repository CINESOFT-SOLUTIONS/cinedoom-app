import { redirect } from "next/navigation";

export default function BackofficeUsuariosRedirect() {
  redirect("/gestao/usuarios");
}
