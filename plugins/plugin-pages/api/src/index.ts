import type { CoreServices } from "@cms/core";
import type { FastifyInstance } from "fastify";
import { PageController } from "./pageController.js";
import { PageService } from "./pageService.js";
import { PagesRepository } from "./repositories/pagesRepository.js";

export {
  BentoGridBlockSchema,
  BlogPostsBlockSchema,
  CodeShowcaseBlockSchema,
  CreatePageSchema,
  FormBlockSchema,
  GalleryBlockSchema,
  HeroBlockSchema,
  InteractiveDemoBlockSchema,
  PAGES_PERMISSIONS,
  PageBlockSchema,
  PageStatusSchema,
  PageTypeSchema,
  TextBlockSchema,
  UpdatePageSchema,
  validateCreatePage,
  validateUpdatePage,
} from "./domain/page.rules.js";
export type {
  BentoGridBlock,
  BlogPostsBlock,
  CodeShowcaseBlock,
  CreatePageInput,
  FormBlock,
  GalleryBlock,
  HeroBlock,
  InteractiveDemoBlock,
  PageBlock,
  PageDoc,
  PageStatus,
  PageType,
  PageVersionDoc,
  TextBlock,
  UpdatePageInput,
} from "./domain/page.rules.js";
export { initPagesMigration } from "./migrations/202601040000_init_pages.js";
export { seedHomePageMigration } from "./migrations/202608200001_seed_home_page.js";
export { PageService } from "./pageService.js";
export { PagesRepository } from "./repositories/pagesRepository.js";

export async function registerPagesPlugin(
  app: FastifyInstance,
  services: CoreServices,
): Promise<void> {
  const { db, logger, hooks, redirects } = services;

  const pagesRepo = new PagesRepository(db, redirects);
  const pageService = new PageService(pagesRepo, hooks, logger);
  const controller = new PageController(pageService, redirects);

  const { registerPageRoutes } = await import("./routes.js");
  registerPageRoutes(app, controller);
}
