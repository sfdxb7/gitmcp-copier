"use client";

import { useEffect, useState, useMemo } from "react";
import { getRepoData } from "../../../shared/repoData";
import Content from "./content";
import { removeLeadingUnderscore } from "../../../shared/urlUtils";

/**
 * This component is used when we can't get the full request URL from the headers
 */
export default function ContentClient() {
  const [locationHref, setLocationHref] = useState("");
  useEffect(() => {
    const locationHref = window.location.href;
    setLocationHref(locationHref);
  }, []);

  const { subdomain, path, owner, repo, url } = useMemo<{
    subdomain?: string;
    path?: string;
    owner?: string;
    repo?: string;
    url?: string;
  }>(() => {
    if (!locationHref) {
      return {};
    }
    const locationWithoutUnderscore = removeLeadingUnderscore(locationHref);
    const locationObj = new URL(locationWithoutUnderscore);
    const host = locationObj.host;
    let pathname = locationObj.pathname;
    const repoData = getRepoData(host, pathname);
    return { ...repoData, url: locationObj.toString() };
  }, [locationHref]);
  return locationHref ? (
    <Content
      subdomain={subdomain}
      path={path}
      owner={owner}
      repo={repo}
      url={url}
    />
  ) : null;
}
