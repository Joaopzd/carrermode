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
