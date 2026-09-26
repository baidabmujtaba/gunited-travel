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

- Security-clearance entry links must pass through `/request/$slug` before checkout so traveller data is always captured.
- Guest checkout writes through the validated server route and keeps receipts and identity documents in private storage; never grant anonymous bucket reads.
- Store social links are HTTPS-only company settings and render publicly only when configured, preventing unsafe or empty footer links.
