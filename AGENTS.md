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

- Compress admin-uploaded raster photos in the browser to bounded WebP files before storage to limit bandwidth usage.
- Stored product photos render through cdnImage() → /storage-cdn/* (vercel.json rewrite) so Vercel's CDN caches them and storage egress stays low.
