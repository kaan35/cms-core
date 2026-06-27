import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import { config } from "@cms/core";


async function seed() {
  console.log("🌱 Starting Database Seeding...");
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
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
      {
        name: "@cms/plugin-pages-api",
        displayName: "Dynamic Pages",
        description: "Block-based page builder and management",
        version: "1.0.0",
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
      {
        name: "@cms/plugin-blog-api",
        displayName: "Blog Posts",
        description: "Blog article creation, editing, and publishing",
        version: "1.0.0",
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
      {
        name: "@cms/plugin-forms-api",
        displayName: "Forms",
        description: "Dynamic form builder and submission handling",
        version: "1.0.0",
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
      {
        name: "@cms/plugin-system-api",
        displayName: "System Management",
        description: "Plugin management and system settings",
        version: "1.0.0",
        isEnabled: true,
        installedAt: new Date(),
        config: {},
      },
    ]);
    console.log("✅ Seeded active plugins registry");

    const ROOT_PERMISSIONS = [
      "pages:read", "pages:write", "pages:delete",
      "blog:read", "blog:write", "blog:delete",
      "forms:read", "forms:write", "forms:delete",
      "users:read", "users:write", "users:delete",
      "settings:read", "settings:write",
      "webhooks:read", "webhooks:write", "webhooks:delete",
      "backups:read", "backups:write",
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
    const passwordHash = await bcrypt.hash("admin123", 10);
    await usersCol.insertOne({
      email: "admin@cms.com",
      passwordHash,
      role: "user",
      permissions: ROOT_PERMISSIONS,
      createdAt: new Date(),
    });
    console.log("✅ Seeded default admin user: admin@cms.com / admin123");

    // 4. Seed Default Content Pages (Home, About, Contact)
    const pagesCol = db.collection("cms_pages");
    await pagesCol.deleteMany({});
    const defaultPages = [
      {
        slug: "home",
        title: "Ana Sayfa",
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
            content: "Yılların deneyimi ve profesyonel ekibimizle yenilikçi çözümler üretiyoruz. Müşteri memnuniyetini en üst düzeyde tutmak birinci önceliğimizdir.",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        slug: "about",
        title: "Hakkımızda",
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
            content: "2018 yılında kurulan firmamız, teknoloji odaklı iş çözümleri sunmaktadır. Genç ve dinamik kadromuzla hedeflerinize ulaşmanızı sağlıyoruz.",
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        slug: "contact",
        title: "İletişim",
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

  } catch (err) {
    console.error("💥 Seeding failed:", err);
  } finally {
    await client.close();
    console.log("🌱 Seeding finished.");
  }
}

seed();
