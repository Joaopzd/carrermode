import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { PaginaErro, PaginaNaoEncontrada } from "@/components/system-page";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <PaginaNaoEncontrada />,
    defaultErrorComponent: ({ reset }) => <PaginaErro reset={reset} />,
  });

  return router;
};
