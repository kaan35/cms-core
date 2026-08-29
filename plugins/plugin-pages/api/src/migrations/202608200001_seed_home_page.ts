import type { IDatabase, Migration } from "@cms/core";
import { randomUUID } from "node:crypto";
import type { PageDoc } from "../domain/page.rules.js";

export const seedHomePageMigration: Migration = {
  id: "202608200001_seed_home_page",
  description: "Create index for pageType and seed default home page",
  up: async (db: IDatabase): Promise<void> => {
    const pagesCollection = db.collection<PageDoc>("cms_pages");
    await pagesCollection.createIndex({ pageType: 1 });

    const existingHome = await pagesCollection.findOne({
      $or: [{ pageType: "home" }, { slug: "home" }],
    });

    if (!existingHome) {
      const now = new Date().toISOString();
      const homePageDoc: PageDoc = {
        id: randomUUID(),
        title: "Home",
        slug: "home",
        pageType: "home",
        status: "published",
        blocks: [
          {
            type: "hero",
            title: "The Ultra-Modern Headless Web Starter",
            subtitle:
              "Architected with Next.js App Router, React Server Components, SWR, and a fully decoupled plugin ecosystem.",
            primaryCta: { label: "Explore Articles", url: "/blog" },
            secondaryCta: { label: "Learn More", url: "/blog" },
            mediaLayout: "background",
          },
          {
            type: "bento_grid",
            cards: [
              {
                title: "Zero-SDK Server Fetching",
                description:
                  "Server Components query backend endpoints with direct typed JSON fetchers. No heavy SDK runtimes, minimal bundle size.",
                icon: "Zap",
                badge: "Performance",
                size: "large",
              },
              {
                title: "Pluggable Verification",
                description:
                  "Forms leverage dynamic validation and mathematical challenge captchas with zero third-party tracking.",
                icon: "Shield",
                badge: "Security",
                size: "medium",
              },
              {
                title: "Dynamic Block Engine",
                description:
                  "Editors assemble pages using composable Hero, Gallery, Text, Form, and Blog blocks in real time.",
                icon: "Layers",
                badge: "Extensible",
                size: "medium",
              },
            ],
          },
          {
            type: "blog_posts",
            limit: 3,
            layout: "grid",
          },
        ],
        metaTitle: "Home — Modern Headless Architecture",
        metaDescription:
          "Ultra-fast headless CMS starter powered by Next.js App Router, React Server Components and SWR.",
        version: 1,
        createdAt: now,
        updatedAt: now,
      };

      await pagesCollection.insertOne(homePageDoc);
    } else if (!existingHome.pageType) {
      await pagesCollection.updateOne({ id: existingHome.id }, { $set: { pageType: "home" } });
    }
  },
};
