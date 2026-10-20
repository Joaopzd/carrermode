<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep career identity and manager on saves; scope club data and custom crests by stint_id to prevent cross-club history leakage.
- Create careers and switch stints through the authenticated SECURITY INVOKER iniciar_passagem transaction; atomic writes prevent partially initialized clubs.
- Reuse CareerOnboarding for initial and subsequent clubs, omitting manager creation for subsequent stints so trainer identity persists.
- Reuse ArquivoPassagem with an explicit historical stint and club for career history, keeping standings read-only and corrections confirmed.
- Retire legacy save club/league fields without deleting them to preserve compatibility and data until a verified backup and authorized removal.
- Refresh the shared club catalog by matching canonical club identities, retaining IDs and crests and detaching omitted clubs instead of deleting them; historical stints keep their own league references.
- Resolve club names through the shared explicit identity aliases for autocomplete, roster lookup and crest lookup; verify external football team identity and country before accepting a crest to avoid ambiguous matches.
- Own session transition handling in the root route and resume authenticated public-home/auth arrivals in the career area so full-page OAuth returns do not strand users on the landing page.
- Delete careers with one owner-scoped saves DELETE using existing cascading foreign keys; keep accounts and the shared catalog and clear cached career data before onboarding.
- Resolve monetary display through the shared country-to-currency registry using the viewed stint's club country (league country fallback), never the currently active club for historical records; formatting does not convert stored amounts.
