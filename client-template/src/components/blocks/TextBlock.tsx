import type { TextBlock as TextBlockType } from "@cms/client-sdk";

export function TextBlock({ data }: { data: TextBlockType }) {
  const content = data.content || "";

  return (
    <section className="py-12">
      <div className="container mx-auto max-w-3xl px-4 sm:px-6">
        <div
          className="prose prose-invert prose-zinc max-w-none text-muted-foreground leading-relaxed space-y-4 [&>h1]:text-3xl [&>h1]:font-bold [&>h1]:text-foreground [&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:text-foreground [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-foreground [&>p]:text-base [&>a]:text-primary [&>a]:underline [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>blockquote]:border-l-2 [&>blockquote]:border-primary [&>blockquote]:pl-4 [&>blockquote]:italic"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    </section>
  );
}
