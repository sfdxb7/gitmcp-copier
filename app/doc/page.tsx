import React from "react";
import { getRepoData } from "../../shared/repoData.ts";
import Content from "./content.tsx";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { url, host } = (await searchParams) as { url?: string; host: string };

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
