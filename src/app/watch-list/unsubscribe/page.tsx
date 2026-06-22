import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Unsubscribe from The Watch List",
  description: "Manage your Watch List subscription from The Watch Alley.",
  alternates: { canonical: "/watch-list/unsubscribe" },
};

function messageForStatus(status: string | undefined) {
  if (status === "success") {
    return {
      title: "You are unsubscribed.",
      body: "You will no longer receive Watch List emails. If you ever want first access again, you can rejoin from the Watch List page.",
    };
  }
  if (status === "invalid") {
    return {
      title: "This link is not valid.",
      body: "The unsubscribe link may be incomplete. Reply to the email or contact The Watch Alley and we will handle it manually.",
    };
  }
  if (status === "error") {
    return {
      title: "We could not update that subscription.",
      body: "Please try the link again, or contact The Watch Alley and we will sort it out manually.",
    };
  }
  return {
    title: "Manage The Watch List.",
    body: "Use the unsubscribe link in a Watch List email to remove that address from future sends.",
  };
}

export default async function WatchListUnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const message = messageForStatus(status);

  return (
    <main className="bg-[#080706] px-6 pb-24 pt-[clamp(110px,14vh,160px)] text-cream md:px-12 lg:px-20">
      <section className="mx-auto max-w-2xl border-t border-amber-300/20 pt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300/80">
          The Watch List
        </p>
        <h1 className="mt-5 font-serif text-[clamp(42px,7vw,82px)] leading-[0.95]">
          {message.title}
        </h1>
        <p className="mt-6 text-[16px] leading-8 text-cream-60">{message.body}</p>
        <Link
          href="/watch-list"
          className="mt-8 inline-flex rounded-xl bg-amber-300 px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#090806]"
        >
          Open The Watch List
        </Link>
      </section>
    </main>
  );
}
