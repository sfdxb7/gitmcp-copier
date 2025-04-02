"use client";

import { useEffect, useState, useMemo } from "react";
import { getRepoData } from "../../../shared/repoData";
import Content from "./content";
import { removeLeadingUnderscore } from "../../../shared/urlUtils";

export default function ContentClient() {
  const [refererUrl, setRefererUrl] = useState("");
  useEffect(() => {
    const refererUrl = window.location.href;
    setRefererUrl(refererUrl);
  }, []);

  const { subdomain, path, owner, repo, url } = useMemo<{
    subdomain?: string;
    path?: string;
    owner?: string;
    repo?: string;
    url?: string;
  }>(() => {
    if (!refererUrl) {
      return {};
    }
    const refererUrlWithoutUnderscore = removeLeadingUnderscore(refererUrl);
    const refererUrlObj = new URL(refererUrlWithoutUnderscore);
    const host = refererUrlObj.host;
    let pathname = refererUrlObj.pathname;
    const repoData = getRepoData(host, pathname);
    return { ...repoData, url: refererUrlObj.toString() };
  }, [refererUrl]);
  return refererUrl ? (
    <Content
      subdomain={subdomain}
      path={path}
      owner={owner}
      repo={repo}
      url={url}
    />
  ) : null;
}
