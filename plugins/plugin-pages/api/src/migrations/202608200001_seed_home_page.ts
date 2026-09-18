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
            title: "Core Architectural Capabilities",
            subtitle:
              "Composable layout blocks, zero-overhead React Server Components, and a fully decoupled plugin ecosystem.",
            columns: "3",
            cards: [
              {
                title: "Zero-SDK Server Fetching",
                description:
                  "Server Components query backend endpoints with direct typed JSON fetchers. No heavy SDK runtimes, minimal bundle size.",
                icon: "Zap",
                badge: "Performance",
                size: "2",
              },
              {
                title: "Pluggable Verification",
                description:
                  "Forms leverage dynamic validation and mathematical challenge captchas with zero third-party tracking.",
                icon: "Shield",
                badge: "Security",
                size: "1",
              },
              {
                title: "Dynamic Block Engine",
                description:
                  "Editors assemble pages using composable Hero, Gallery, Text, Form, and Blog blocks in real time.",
                icon: "Layers",
                badge: "Extensible",
                size: "1",
              },
              {
                title: "Encrypted Secrets & App Vault",
                description:
                  "Integrated custom application plugins like Password Vault provide AES-256-GCM secure storage and secrets entropy generation.",
                icon: "Lock",
                badge: "Security",
                size: "2",
              },
            ],
          },
          {
            type: "blog_posts",
            title: "Latest Publications",
            subtitle:
              "Read our latest architectural deep dives, release notes, and engineering patterns.",
            badge: "From the Blog",
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
