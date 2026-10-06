# Compress every newly uploaded image

## Changes
- Add one shared browser-side image compressor for product and review photos.
- Resize large photos to a maximum of 1600px and save them as WebP at a balanced quality before upload.
- Keep transparent images correct and reject unsupported or oversized files safely.
- Show the reduced file size after upload and preserve the existing long-term cache setting.
- Add Vercel caching rules for bundled website images.

## Verification
- Test product and review uploads with a large photo.
- Confirm the stored file is WebP, materially smaller, and still displays correctly.
- Check the current preview build and mobile product display.

## Note
Existing photos already stored online are not rewritten by this browser upload change. New uploads and replacements will be compressed automatically.
