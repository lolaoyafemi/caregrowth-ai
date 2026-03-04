

## Plan: Switch Image Generation to OpenAI DALL-E 3

The current code uses Gemini models via the Lovable AI Gateway, which keeps returning 502 errors. You already have an `OPENAI_API_KEY` secret configured. We'll switch to calling OpenAI's DALL-E 3 API directly.

### Changes to `supabase/functions/generate-post-image/index.ts`

1. **Replace `LOVABLE_API_KEY` with `OPENAI_API_KEY`** from Deno.env
2. **Switch endpoint** from `ai.gateway.lovable.dev/v1/chat/completions` to `api.openai.com/v1/images/generations`
3. **Use DALL-E 3** with `1024x1024` size and `standard` quality
4. **Simplify response handling** — DALL-E returns `data[0].url` (a hosted URL), so we fetch the image bytes from that URL and upload to Supabase storage (no base64 parsing from chat responses)
5. **Keep retry logic** (3 attempts with backoff) but remove the multi-model loop since DALL-E is a single reliable endpoint
6. **Redeploy** the edge function

### Key flow change

```text
BEFORE:  Lovable Gateway → Gemini image model → base64 in chat response → upload
AFTER:   OpenAI API → DALL-E 3 → image URL → fetch bytes → upload
```

Single file change + redeploy. No database or frontend changes needed.

