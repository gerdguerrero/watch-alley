import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribe from The Watch List",
  description: "Manage your Watch List subscription from The Watch Alley.",
  alternates: { canonical: "/watch-list/unsubscribe" },
};

export default function UnsubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
