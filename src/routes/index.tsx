import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Gestão Inteligente de Servidores da Educação" },
      { name: "description", content: "Acesso ao sistema de gestão de servidores da Secretaria Municipal de Educação." },
      { property: "og:title", content: "Gestão Inteligente de Servidores da Educação" },
      { property: "og:description", content: "Cadastro, indicadores, vagas e relatórios dos servidores da rede municipal." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/painel" });
  },
});
