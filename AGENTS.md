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

## Architecture rules
- Permissions live in DB (`user_roles` + configurable `role_permissions`, checked by `has_perm()` in RLS); UI checks via `usePerms().can()` are cosmetic only — always add the matching RLS policy.
- CPF is stored only in `servidores_sensiveis` (RLS `cpf.ver`) so it never travels with ordinary server lists; unique-person counts go through the `contar_servidores_unicos` RPC.
- Auditing is done by the `fn_auditoria` DB trigger on every business table; never write audit rows from the client.
- Calculation rules (vagas, em exercício) live in `src/lib/calc.ts` / `src/lib/vagas.ts` with tests in `src/lib/calc.test.ts`; vacancies are only "confirmed" when `status_validacao = 'confirmado'`.
- Spreadsheet import is pure parsing/classification in `src/lib/importar.ts`; updates key on matrícula and only overwrite fields present in the sheet.
- Account creation is admin-only through server functions in `src/lib/usuarios.functions.ts` (public signup disabled); first admin via `criarPrimeiroAdmin` only while no admin exists.
