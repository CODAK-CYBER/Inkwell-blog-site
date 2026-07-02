"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/utils";

async function requireCategoryManager() {
  const session = await getServerSession();
  if (!session || !hasPermission(session.user.role, { category: ["create"] })) {
    throw new Error("Not permitted");
  }
  return session;
}

function revalidateTaxonomy() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/tags");
  revalidatePath("/categories");
  revalidatePath("/");
}

export interface CategoryInput {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string;
  sortOrder?: number;
  seoTitle?: string;
  seoDescription?: string;
}

export async function saveCategory(input: CategoryInput, id?: string) {
  const session = await requireCategoryManager();

  const data = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    icon: input.icon?.trim() || null,
    image: input.image?.trim() || null,
    parentId: input.parentId && input.parentId !== id ? input.parentId : null,
    sortOrder: input.sortOrder ?? 0,
    seoTitle: input.seoTitle?.trim() || null,
    seoDescription: input.seoDescription?.trim() || null,
  };
  if (!data.name) return { error: "Name is required." };

  const slug = slugify(input.slug || input.name);

  try {
    if (id) {
      await prisma.category.update({ where: { id }, data: { ...data, slug } });
    } else {
      await prisma.category.create({ data: { ...data, slug } });
    }
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { error: "A category with that slug already exists." };
    }
    throw err;
  }

  await logActivity({
    userId: session.user.id,
    action: id ? "category.updated" : "category.created",
    targetType: "category",
    detail: data.name,
  });
  revalidateTaxonomy();
  return { success: true };
}

export async function deleteCategory(id: string) {
  const session = await requireCategoryManager();
  if (!hasPermission(session.user.role, { category: ["delete"] })) {
    return { error: "You don't have permission to delete categories." };
  }
  const category = await prisma.category.delete({ where: { id } });
  await logActivity({
    userId: session.user.id,
    action: "category.deleted",
    targetType: "category",
    detail: category.name,
  });
  revalidateTaxonomy();
  return { success: true };
}

// ---------------- Collections ----------------

export interface CollectionInput {
  name: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  featured?: boolean;
}

export async function saveCollection(input: CollectionInput, id?: string) {
  const session = await requireCategoryManager();
  const name = input.name.trim();
  if (!name) return { error: "Name is required." };
  const slug = slugify(input.slug || name);
  const data = {
    name,
    slug,
    description: input.description?.trim() || null,
    coverImage: input.coverImage?.trim() || null,
    featured: input.featured ?? false,
  };
  try {
    if (id) await prisma.collection.update({ where: { id }, data });
    else await prisma.collection.create({ data });
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { error: "A collection with that slug already exists." };
    }
    throw err;
  }
  await logActivity({
    userId: session.user.id,
    action: id ? "collection.updated" : "collection.created",
    targetType: "collection",
    detail: name,
  });
  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  return { success: true };
}

export async function deleteCollection(id: string) {
  const session = await requireCategoryManager();
  const collection = await prisma.collection.delete({ where: { id } });
  await logActivity({
    userId: session.user.id,
    action: "collection.deleted",
    targetType: "collection",
    detail: collection.name,
  });
  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  return { success: true };
}

export async function toggleArticleInCollection(collectionId: string, articleId: string) {
  await requireCategoryManager();
  const existing = await prisma.collectionItem.findUnique({
    where: { collectionId_articleId: { collectionId, articleId } },
  });
  if (existing) {
    await prisma.collectionItem.delete({
      where: { collectionId_articleId: { collectionId, articleId } },
    });
  } else {
    await prisma.collectionItem.create({ data: { collectionId, articleId } });
  }
  revalidatePath("/admin/collections");
  revalidatePath("/collections");
  return { added: !existing };
}

export async function createTag(name: string) {
  const session = await requireCategoryManager();
  const clean = name.trim();
  if (!clean) return { error: "Name is required." };
  const slug = slugify(clean);
  try {
    await prisma.tag.create({ data: { name: clean.toLowerCase(), slug } });
  } catch {
    return { error: "That tag already exists." };
  }
  await logActivity({ userId: session.user.id, action: "tag.created", targetType: "tag", detail: clean });
  revalidateTaxonomy();
  return { success: true };
}

export async function deleteTag(id: string) {
  const session = await requireCategoryManager();
  const tag = await prisma.tag.delete({ where: { id } });
  await logActivity({ userId: session.user.id, action: "tag.deleted", targetType: "tag", detail: tag.name });
  revalidateTaxonomy();
  return { success: true };
}

/** Move every article from `sourceId` onto `targetId`, then delete the source. */
export async function mergeTags(sourceId: string, targetId: string) {
  const session = await requireCategoryManager();
  if (sourceId === targetId) return { error: "Pick two different tags." };

  const [source, target] = await Promise.all([
    prisma.tag.findUnique({ where: { id: sourceId } }),
    prisma.tag.findUnique({ where: { id: targetId } }),
  ]);
  if (!source || !target) return { error: "Tag not found." };

  const links = await prisma.articleTag.findMany({ where: { tagId: sourceId } });
  for (const link of links) {
    await prisma.articleTag.upsert({
      where: { articleId_tagId: { articleId: link.articleId, tagId: targetId } },
      create: { articleId: link.articleId, tagId: targetId },
      update: {},
    });
  }
  await prisma.tag.delete({ where: { id: sourceId } });

  await logActivity({
    userId: session.user.id,
    action: "tag.merged",
    targetType: "tag",
    detail: `${source.name} → ${target.name}`,
  });
  revalidateTaxonomy();
  return { success: true };
}
