import type { PageBlock } from "@cms/client-sdk";
import { BentoGridBlock } from "./blocks/BentoGridBlock";
import { BlogPostsBlock } from "./blocks/BlogPostsBlock";
import { CodeShowcaseBlock } from "./blocks/CodeShowcaseBlock";
import { FormBlock } from "./blocks/FormBlock";
import { GalleryBlock } from "./blocks/GalleryBlock";
import { HeroBlock } from "./blocks/HeroBlock";
import { InteractiveDemoBlock } from "./blocks/InteractiveDemoBlock";
import { TextBlock } from "./blocks/TextBlock";

export function BlockRenderer({ blocks }: { blocks?: PageBlock[] }) {
  if (!blocks || blocks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col w-full">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        switch (block.type) {
          case "hero":
            return <HeroBlock key={key} data={block} />;

          case "gallery":
            return <GalleryBlock key={key} data={block} />;

          case "text":
            return <TextBlock key={key} data={block} />;

          case "form":
            return <FormBlock key={key} data={block} />;

          case "blog_posts":
            return <BlogPostsBlock key={key} data={block} />;

          case "bento_grid":
            return (
              <BentoGridBlock
                key={key}
                data={block as unknown as Parameters<typeof BentoGridBlock>[0]["data"]}
              />
            );

          case "code_showcase":
            return (
              <CodeShowcaseBlock
                key={key}
                data={block as unknown as Parameters<typeof CodeShowcaseBlock>[0]["data"]}
              />
            );

          case "interactive_demo":
            return (
              <InteractiveDemoBlock
                key={key}
                data={block as unknown as Parameters<typeof InteractiveDemoBlock>[0]["data"]}
              />
            );

          default:
            if (process.env.NODE_ENV === "development") {
              console.warn(`[BlockRenderer] Unknown block type:`, (block as { type: string }).type);
            }
            return null;
        }
      })}
    </div>
  );
}
