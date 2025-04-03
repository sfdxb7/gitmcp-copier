export function getRepoData(
  requestHost: string,
  requestUrl?: string,
): { subdomain?: string; path?: string; owner?: string; repo?: string } {
  // Parse the URL if provided
  console.log("-------getRepoData-----------");
  console.log("requestHost", requestHost);
  console.log("requestUrl", requestUrl);
  const protocol = requestHost.includes("localhost") ? "http" : "https";
  let fullUrl = new URL(`${protocol}://${requestHost}`);
  if (requestUrl) {
    if (requestUrl.startsWith("/")) {
      fullUrl = new URL(`${protocol}://${requestHost}${requestUrl}`);
    } else {
      fullUrl = new URL(`${protocol}://${requestUrl}`);
    }
  }
  const path = fullUrl.pathname.split("/").filter(Boolean).join("/");

  // Check for subdomain pattern: {subdomain}.gitmcp.io/{path}
  if (requestHost.includes(".gitmcp.io")) {
    const subdomain = requestHost.split(".")[0];
    console.log("subdomain", subdomain);
    console.log("path", path);
    console.log("-------------------------");
    return { subdomain, path };
  }
  // Check for github repo pattern: gitmcp.io/{owner}/{repo} or git-mcp.vercel.app/{owner}/{repo}
  else if (
    requestHost === "gitmcp.io" ||
    requestHost === "git-mcp.vercel.app"
  ) {
    // Extract owner/repo from path
    const [owner, repo] = path.split("/");
    if (owner && repo) {
      console.log("owner", owner);
      console.log("repo", repo);
      console.log("-------------------------");
      return { owner, repo };
    }
  }
  console.log("returning empty object");
  console.log("-------------------------");
  return {};
}
