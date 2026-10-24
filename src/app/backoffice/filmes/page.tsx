import { redirect } from "next/navigation";

export default function BackofficeFilmesRedirect() {
  redirect("/gestao/filmes");
}
