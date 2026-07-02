import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * RBAC for the whole platform. Adding a permission later = add it to a
 * statement and grant it to roles; no schema change needed.
 * `defaultStatements` covers user/session management (ban, set-role, ...).
 */
const statement = {
  ...defaultStatements,
  article: ["create", "update", "updateOwn", "delete", "deleteOwn", "publish", "feature", "readPremium"],
  comment: ["create", "moderate", "delete"],
  category: ["create", "update", "delete"],
  media: ["upload", "delete"],
  newsletter: ["manage"],
  analytics: ["view"],
  ads: ["manage"],
  siteSettings: ["manage"],
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  superadmin: ac.newRole({
    ...adminAc.statements,
    article: ["create", "update", "updateOwn", "delete", "deleteOwn", "publish", "feature", "readPremium"],
    comment: ["create", "moderate", "delete"],
    category: ["create", "update", "delete"],
    media: ["upload", "delete"],
    newsletter: ["manage"],
    analytics: ["view"],
    ads: ["manage"],
    siteSettings: ["manage"],
  }),
  admin: ac.newRole({
    ...adminAc.statements,
    article: ["create", "update", "updateOwn", "delete", "deleteOwn", "publish", "feature", "readPremium"],
    comment: ["create", "moderate", "delete"],
    category: ["create", "update", "delete"],
    media: ["upload", "delete"],
    newsletter: ["manage"],
    analytics: ["view"],
    ads: ["manage"],
  }),
  editor: ac.newRole({
    article: ["create", "update", "updateOwn", "delete", "deleteOwn", "publish", "feature", "readPremium"],
    comment: ["create", "moderate"],
    category: ["create", "update"],
    media: ["upload"],
    analytics: ["view"],
  }),
  author: ac.newRole({
    article: ["create", "updateOwn", "deleteOwn", "readPremium"],
    comment: ["create"],
    media: ["upload"],
  }),
  moderator: ac.newRole({
    comment: ["create", "moderate", "delete"],
  }),
  premium: ac.newRole({
    article: ["readPremium"],
    comment: ["create"],
  }),
  user: ac.newRole({
    comment: ["create"],
  }),
};
