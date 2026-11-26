export const isolatedPreviewBranch = "work/crm-broker-quick-service-20261104";

export function resolvePreviewMediaPolicy(env) {
  if ([isolatedPreviewBranch, "codex/crm-operational-priority-20261125"].includes(env.VERCEL_GIT_COMMIT_REF)) {
    if (env.VERCEL_ENV !== "preview") {
      throw new Error("The isolated CRM branch requires a Preview environment.");
    }
    return "isolated";
  }
  // Do not silently classify an unidentified deployment as another branch's Preview.
  if (env.VERCEL_ENV === "preview" && !env.VERCEL_GIT_COMMIT_REF) {
    throw new Error("Preview media policy requires an identified Git branch.");
  }
  return "standard";
}
