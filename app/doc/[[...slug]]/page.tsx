import React from "react";
import { getRepoData } from "../../../shared/repoData";
import Content from "./content";
import { headers } from "next/headers";
import ContentClient from "./content.client";
import { removeLeadingUnderscore } from "../../../shared/urlUtils";

export default async function Page({}) {
  const headersList = await headers();
  const referer = headersList.get("referer");
  if (!referer) {
    return <ContentClient />;
  }
  const refererUrlWithoutUnderscore = removeLeadingUnderscore(referer);
  const refererUrl = new URL(refererUrlWithoutUnderscore);
  const host = refererUrl.host;
  const pathname = refererUrl.pathname;

  const { subdomain, path, owner, repo } = getRepoData(host, pathname);

  return (
    <Content
      subdomain={subdomain}
      path={path}
      owner={owner}
      repo={repo}
      url={refererUrl.toString()}
    />
  );
}
