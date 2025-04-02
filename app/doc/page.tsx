import React from "react";
import { getRepoData } from "../../shared/repoData";
import Content from "./content";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { url } = (await searchParams) as { url?: string; host: string };
  const originalUrl = new URL(url || "");
  const host = originalUrl.host;

  const { subdomain, path, owner, repo } = getRepoData(host, url);

  return (
    <Content
      subdomain={subdomain}
      path={path}
      owner={owner}
      repo={repo}
      url={url}
    />
  );
}
