import { config } from "@cms/core";
import { MongoClient } from "mongodb";

/**
 * Generate test form submissions for testing pagination.
 * Usage: npm run generate-test-data --workspace=templates/api          (defaults to 200)
 *        npm run generate-test-data --workspace=templates/api -- 10    (custom count)
 */
const SUBMISSION_COUNT = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 200;

const names = [
  "Ali Yılmaz", "Ayşe Demir", "Mehmet Kaya", "Fatma Çelik", "Ahmet Şahin",
  "Zeynep Yıldız", "Mustafa Aydın", "Elif Özdemir", "Hüseyin Koç", "Hatice Arslan",
  "İbrahim Doğan", "Emine Kara", "Hasan Çetin", "Meryem Özkan", "Ömer Şimşek",
  "Rabia Yılmaz", "Emre Kılıç", "Büşra Aslan", "Yunus Polat", "Seda Kurt"
];

const emails = [
  "ali.yilmaz@example.com", "ayse.demir@example.com", "mehmet.kaya@example.com",
  "fatma.celik@example.com", "ahmet.sahin@example.com", "zeynep.yildiz@example.com",
  "mustafa.aydin@example.com", "elif.ozdemir@example.com", "huseyin.koc@example.com",
  "hatice.arslan@example.com", "ibrahim.dogan@example.com", "emine.kara@example.com",
  "hasan.cetin@example.com", "meryem.ozkan@example.com", "omer.simsek@example.com",
  "rabia.yilmaz@example.com", "emre.kilic@example.com", "busra.aslan@example.com",
  "yunus.polat@example.com", "seda.kurt@example.com"
];

const messages = [
  "Merhaba, ürünleriniz hakkında detaylı bilgi alabilir miyim?",
  "Web siteniz çok güzel, tebrikler!",
  "Fiyat teklifi almak istiyorum.",
  "Müşteri hizmetleriniz harika, teşekkürler.",
  "Ürünü ne zaman teslim alacağım?",
  "Kampanyalarınız devam ediyor mu?",
  "Toplu alım için indirim var mı?",
  "Kargo ücretsiz mi?",
  "İade şartlarınız nedir?",
  "Kredi kartıyla taksit yapabilir miyim?",
  "Özel tasarım yapıyor musunuz?",
  "Stokta var mı bu ürün?",
  "Garanti süresi ne kadar?",
  "Farklı renk seçenekleri var mı?",
  "Teknik destek hizmeti veriyor musunuz?",
  "Montaj hizmeti sunuyor musunuz?",
  "Kurumsal müşterileriniz için avantajlar neler?",
  "Online ödeme güvenli mi?",
  "Siparişimi nasıl takip edebilirim?",
  "Yurt dışına gönderim yapıyor musunuz?"
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

async function generateTestSubmissions() {
  console.log("🌱 Starting Test Submission Generation...");
  const client = new MongoClient(config.MONGO_URI);

  try {
    await client.connect();
    const db = client.db(config.MONGO_DB_NAME);
    const submissionsCol = db.collection("cms_form_submissions");

    // Check if contact-form exists
    const formsCol = db.collection("cms_forms");
    const form = await formsCol.findOne({ formId: "contact-form" });

    if (!form) {
      console.error("❌ contact-form not found! Run seed.ts first.");
      return;
    }

    // Idempotent re-runs: clear only this form's previous test submissions
    await submissionsCol.deleteMany({ formId: "contact-form" });

    // Generate SUBMISSION_COUNT submissions
    const submissions = [];
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    for (let i = 0; i < SUBMISSION_COUNT; i++) {
      submissions.push({
        formId: "contact-form",
        data: {
          fullName: randomElement(names),
          email: randomElement(emails),
          message: randomElement(messages),
        },
        createdAt: randomDate(startDate, endDate),
      });
    }

    // Sort by date (oldest first)
    submissions.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Insert all at once
    await submissionsCol.insertMany(submissions);

    console.log(`✅ Successfully inserted ${submissions.length} test submissions`);
    console.log(`📊 Date range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`);

    // Show stats
    const total = await submissionsCol.countDocuments({ formId: "contact-form" });
    console.log(`📈 Total submissions for contact-form: ${total}`);

  } catch (err) {
    console.error("💥 Generation failed:", err);
  } finally {
    await client.close();
    console.log("🌱 Generation finished.");
  }
}

generateTestSubmissions();
