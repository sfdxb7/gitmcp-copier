export function getRepoData(
  requestHost: string,
  requestUrl?: string,
): { subdomain?: string; path?: string; owner?: string; repo?: string } {
  // Parse the URL if provided
  let fullUrl = new URL(`http://${requestHost}`);
  if (requestUrl) {
    if (requestUrl.startsWith("/")) {
      fullUrl = new URL(`http://${requestHost}${requestUrl}`);
    } else {
      fullUrl = new URL(`${requestUrl}`);
    }
  }
  const path = fullUrl.pathname.split("/").filter(Boolean).join("/");

  // Check for subdomain pattern: {subdomain}.gitmcp.io/{path}
  if (requestHost.includes(".gitmcp.io")) {
    const subdomain = requestHost.split(".")[0];
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
      return { owner, repo };
    }
  }
  return {};
}
