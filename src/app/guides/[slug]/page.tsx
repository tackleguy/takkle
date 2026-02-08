import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { getGuideBySlug, getAllGuideSlugs, guides } from "@/data/guides";
import EmailCapture from "@/components/EmailCapture";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return {};

  return {
    title: guide.seoTitle,
    description: guide.seoDescription,
    openGraph: {
      title: guide.seoTitle,
      description: guide.seoDescription,
      url: `https://takkle.com/guides/${guide.slug}`,
      siteName: "Takkle",
      type: "article",
      publishedTime: guide.publishedDate,
      modifiedTime: guide.updatedDate,
      authors: ["Takkle Team"],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.seoTitle,
      description: guide.seoDescription,
    },
    alternates: {
      canonical: `https://takkle.com/guides/${guide.slug}`,
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);

  if (!guide) {
    notFound();
  }

  // Parse content into sections
  const sections = guide.content.split(/(?=^## )/m);
  const intro = sections[0];
  const contentSections = sections.slice(1);

  // Get other guides for related links
  const otherGuides = guides.filter((g) => g.slug !== guide.slug).slice(0, 3);

  return (
    <>
      {/* Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: guide.title,
            description: guide.description,
            datePublished: guide.publishedDate,
            dateModified: guide.updatedDate,
            author: {
              "@type": "Organization",
              name: "Takkle Team",
              url: "https://takkle.com",
            },
            publisher: {
              "@type": "Organization",
              name: "Takkle",
              url: "https://takkle.com",
            },
            mainEntityOfPage: {
              "@type": "WebPage",
              "@id": `https://takkle.com/guides/${guide.slug}`,
            },
          }),
        }}
      />

      {/* BreadcrumbList Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Home",
                item: "https://takkle.com",
              },
              {
                "@type": "ListItem",
                position: 2,
                name: "Guides",
                item: "https://takkle.com/guides",
              },
              {
                "@type": "ListItem",
                position: 3,
                name: guide.title,
                item: `https://takkle.com/guides/${guide.slug}`,
              },
            ],
          }),
        }}
      />

      <article className="py-8 sm:py-12 px-4">
        <div className="mx-auto max-w-3xl">
          {/* Breadcrumbs */}
          <nav className="mb-6 text-sm text-text-muted" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="hover:text-accent transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link
                  href="/guides"
                  className="hover:text-accent transition-colors"
                >
                  Guides
                </Link>
              </li>
              <li>/</li>
              <li className="text-text-secondary truncate max-w-[200px]">
                {guide.title}
              </li>
            </ol>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold font-[family-name:var(--font-heading)] leading-tight mb-4">
            {guide.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-text-muted mb-8">
            <span>By Takkle Team</span>
            <span>&middot;</span>
            <span>
              Updated{" "}
              {new Date(guide.updatedDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>

          {/* Table of Contents */}
          <div className="bg-bg-card border border-border rounded-xl p-6 mb-10">
            <h2 className="text-sm font-semibold text-text-primary mb-3 uppercase tracking-wide">
              Table of Contents
            </h2>
            <ol className="space-y-2">
              {guide.toc.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="text-sm text-text-secondary hover:text-accent transition-colors"
                  >
                    {i + 1}. {item.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* Intro */}
          <div className="text-text-secondary text-sm leading-relaxed space-y-4 mb-8">
            {intro
              .trim()
              .split("\n\n")
              .map((p, i) => (
                <p key={i}>{renderInlineMarkdown(p)}</p>
              ))}
          </div>

          {/* Content sections */}
          {contentSections.map((section, i) => {
            const lines = section.trim().split("\n");
            const heading = lines[0].replace("## ", "");
            const body = lines.slice(1).join("\n").trim();
            const tocItem = guide.toc[i];

            return (
              <div key={i} className="mb-10" id={tocItem?.id}>
                <h2 className="text-2xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-4">
                  {heading}
                </h2>
                <div className="text-text-secondary text-sm leading-relaxed space-y-4">
                  {body.split("\n\n").map((paragraph, j) => (
                    <p key={j}>{renderInlineMarkdown(paragraph)}</p>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Email CTA */}
          <div className="my-12">
            <EmailCapture
              source="guide"
              headline={guide.emailCTA.headline}
              description={guide.emailCTA.description}
            />
          </div>

          {/* Related Guides */}
          <div className="mt-12">
            <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] text-text-primary mb-4">
              More Guides
            </h2>
            <div className="space-y-3">
              {otherGuides.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guides/${g.slug}`}
                  className="block px-4 py-3 bg-bg-card border border-border rounded-lg hover:bg-bg-card-hover transition-colors text-sm text-text-secondary hover:text-text-primary"
                >
                  {g.title} &rarr;
                </Link>
              ))}
            </div>
          </div>
        </div>
      </article>
    </>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Handle bold, links, and inline code
  const parts = text.split(
    /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/
  );

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-text-primary">
          {part.replace(/\*\*/g, "")}
        </strong>
      );
    }

    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      return (
        <Link
          key={i}
          href={linkMatch[2]}
          className="text-accent hover:text-accent-hover underline underline-offset-4"
        >
          {linkMatch[1]}
        </Link>
      );
    }

    return <span key={i}>{part}</span>;
  });
}
