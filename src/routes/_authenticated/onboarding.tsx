import { createFileRoute } from "@tanstack/react-router";
import { CareerOnboarding } from "@/components/career-onboarding";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [
    { title: "Montar carreira | Carreira FC Manager" },
    { name: "description", content: "Escolha liga e clube, crie o treinador e cadastre comissão e elenco." },
    { property: "og:title", content: "Montar carreira | Carreira FC Manager" },
    { property: "og:description", content: "Inicie sua carreira de futebol com treinador, comissão e elenco." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: OnboardingPage,
});

function OnboardingPage() { return <CareerOnboarding />; }