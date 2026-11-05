export const isolatedPreviewBranch: string;
export function resolvePreviewMediaPolicy(env: {
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_REF?: string;
}): "isolated" | "standard";
