export function presentationImage(token: string, propertyId: number, index: number, original: string) {
  if (!/\/api\/property-media\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/.test(original)) return original;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/functions/v1/crm-presentation-media?${new URLSearchParams({token, property:String(propertyId), image:String(index)})}`;
}

export function presentationAsset(token: string, assetId: number) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return "";
  return `${base}/functions/v1/crm-presentation-media?${new URLSearchParams({token, asset:String(assetId)})}`;
}
