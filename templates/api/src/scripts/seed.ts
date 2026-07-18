import { config } from "@cms/core";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { MongoClient } from "mongodb";

async function seed() {
  console.log("🌱 Starting Database Seeding...");
  if (config.NODE_ENV === "production") {
    console.error(
      "❌ Seed script can't run in production. Create users manually or with migration script.",
    );
    process.exit(1);
  }
  const client = new MongoClient(config.MONGO_URI);

  try {
    await client.connect();
    const db = client.db(config.MONGO_DB_NAME);

    // 1. Seed Plugins
    const pluginsCol = db.collection("cms_plugins");
    await pluginsCol.deleteMany({}); // Reset for clean state
    await pluginsCol.insertMany([
      {
        name: "@cms/plugin-auth-api",
        displayName: "Authentication & Users",
        description: "User authentication, roles, and permissions management",
        version: "1.0.0",
        priority: 100,
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
      {
        name: "@cms/plugin-pages-api",
        displayName: "Dynamic Pages",
        description: "Block-based page builder and management",
        version: "1.0.0",
        priority: 50,
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
      {
        name: "@cms/plugin-blog-api",
        displayName: "Blog Posts",
        description: "Blog article creation, editing, and publishing",
        version: "1.0.0",
        priority: 50,
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
      {
        name: "@cms/plugin-forms-api",
        displayName: "Forms",
        description: "Dynamic form builder and submission handling",
        version: "1.0.0",
        priority: 50,
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
      {
        name: "@cms/plugin-system-api",
        displayName: "System Management",
        description: "Plugin management and system settings",
        version: "1.0.0",
        priority: 50,
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
    ]);
    console.log("✅ Seeded active plugins registry");

    const ROOT_PERMISSIONS = [
      "backups:read",
      "backups:write",
      "blog:delete",
      "blog:read:draft",
      "blog:read",
      "blog:write",
      "forms:delete",
      "forms:read",
      "forms:submissions:read",
      "forms:write",
      "pages:delete",
      "pages:read",
      "pages:write",
      "settings:read",
      "settings:write",
      "users:delete",
      "users:read",
      "users:write",
      "webhooks:delete",
      "webhooks:read",
      "webhooks:write",
    ];

    // 2. Seed Role Templates
    const rolesCol = db.collection("cms_roles");
    await rolesCol.deleteMany({});
    await rolesCol.insertOne({
      name: "Root",
      description: "Full system access with all permissions",
      permissions: ROOT_PERMISSIONS,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("✅ Seeded root role template");

    // 3. Seed Default Admin User
    const usersCol = db.collection("cms_users");
    await usersCol.deleteMany({});
    const seedPassword =
      process.env.ADMIN_SEED_PASSWORD ?? crypto.randomBytes(9).toString("base64url");
    const passwordHash = await bcrypt.hash(seedPassword, 10);

    const seedEmail = process.env.ADMIN_SEED_EMAIL ?? "admin@cms.com";
    await usersCol.insertOne({
      email: seedEmail,
      passwordHash,
      role: "user",
      permissions: ROOT_PERMISSIONS,
      createdAt: new Date(),
    });
    console.log(`✅ Seeded default admin user: ${seedEmail} / ${seedPassword}`);

    // 4. Seed Default Content Pages (Home, About, Contact)
    const pagesCol = db.collection("cms_pages");
    await pagesCol.deleteMany({});
    const defaultPages = [
      {
        slug: "home",
        title: "Ana Sayfa",
        status: "published",
        blocks: [
          {
            id: "b1",
            type: "hero",
            title: "Geleceğin Dijital Çözümleri",
            subtitle: "Kurumsal sitemiz ile işinizi büyütün ve geleceği yakalayın.",
          },
          {
            id: "b2",
            type: "text",
            content:
              "Yılların deneyimi ve profesyonel ekibimizle yenilikçi çözümler üretiyoruz. Müşteri memnuniyetini en üst düzeyde tutmak birinci önceliğimizdir.",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        slug: "about",
        title: "Hakkımızda",
        status: "published",
        blocks: [
          {
            id: "a1",
            type: "hero",
            title: "Hakkımızda",
            subtitle: "Biz kimiz ve ne yapıyoruz?",
          },
          {
            id: "a2",
            type: "text",
            content:
              "2018 yılında kurulan firmamız, teknoloji odaklı iş çözümleri sunmaktadır. Genç ve dinamik kadromuzla hedeflerinize ulaşmanızı sağlıyoruz.",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        slug: "contact",
        title: "İletişim",
        status: "published",
        blocks: [
          {
            id: "c1",
            type: "hero",
            title: "Bize Ulaşın",
            subtitle: "Her türlü soru ve öneriniz için bizimle iletişime geçebilirsiniz.",
          },
          {
            id: "c2",
            type: "form",
            formId: "contact-form", // We will link it by formId
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await pagesCol.insertMany(defaultPages);
    console.log("✅ Seeded default pages (Home, About, Contact)");

    // 5. Seed Default Form
    const formsCol = db.collection("cms_forms");
    await formsCol.deleteMany({});
    await formsCol.insertOne({
      formId: "contact-form",
      name: "İletişim Formu",
      fields: [
        { name: "fullName", type: "text", label: "Ad Soyad", required: true },
        { name: "email", type: "email", label: "E-Posta Adresi", required: true },
        { name: "message", type: "textarea", label: "Mesajınız", required: true },
      ],
      createdAt: new Date(),
    });
    console.log("✅ Seeded contact form");

    // 6. Seed Sample Blog Posts
    const blogPostsCol = db.collection("cms_blog_posts");
    await blogPostsCol.deleteMany({});
    await blogPostsCol.insertMany([
      {
        title: "What is Lorem Ipsum?",
        slug: "what-is-lorem-ipsum",
        summary:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966",
        content:
          "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library in London, took a 1914 Cicero translation and scrambled it to make dummy text for Letraset's Body Type sheets.\n\nIt has survived not only many decades, but also the leap into electronic typesetting, remaining essentially unchanged. It was popularised thanks to these sheets and more recently with desktop publishing software like Aldus PageMaker and Microsoft Word including versions of Lorem Ipsum.",
        status: "published",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Why do we use it?",
        slug: "why-do-we-use-it",
        summary:
          "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.",
        content:
          "It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout. The point of using Lorem Ipsum is that it has a more-or-less normal distribution of letters, as opposed to using 'Content here, content here', making it look like readable English. \n\nMany desktop publishing packages and web page editors now use Lorem Ipsum as their default model text, and a search for 'lorem ipsum' will uncover many web sites still in their infancy. Various versions have evolved over the years, sometimes by accident, sometimes on purpose (injected humour and the like)",
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    console.log("✅ Seeded sample blog posts");

    // 7. Seed Settings
    const settingsCol = db.collection("cms_settings");
    await settingsCol.deleteMany({});
    await settingsCol.insertOne({
      brandName: "ModularCMS",
      primaryColor: "#3b82f6",
      secondaryColor: "#0070f3",
      createdAt: new Date(),
    });

    console.log("✅ Seeded system settings");
  } catch (err) {
    console.error("💥 Seeding failed:", err);
  } finally {
    await client.close();
    console.log("🌱 Seeding finished.");
  }
}

seed();
