export type RepoData = {
  subdomain?: string;
  path?: string;
  owner?: string;
  repo?: string;
};
type GetRepoDataLog = RepoData & {
  requestHost: string;
  requestUrl: string | undefined;
};
export function getRepoData(
  requestHost: string,
  requestUrl?: string,
): RepoData {
  // Parse the URL if provided
  const getRepoDataLog: GetRepoDataLog = {
    requestHost,
    requestUrl,
  };
  const protocol = requestHost.includes("localhost") ? "http" : "https";
  let fullUrl = new URL(`${protocol}://${requestHost}`);
  if (requestUrl) {
    if (requestUrl.startsWith("/")) {
      fullUrl = new URL(`${protocol}://${requestHost}${requestUrl}`);
    } else if (requestUrl.startsWith("http")) {
      fullUrl = new URL(requestUrl);
    } else {
      fullUrl = new URL(`${protocol}://${requestUrl}`);
    }
  }
  const path = fullUrl.pathname.split("/").filter(Boolean).join("/");

  // Check for subdomain pattern: {subdomain}.gitmcp.io/{path}
  if (requestHost.includes(".gitmcp.io")) {
    const subdomain = requestHost.split(".")[0];
    getRepoDataLog.subdomain = subdomain;
    getRepoDataLog.path = path;
    console.log("getRepoDataLog", JSON.stringify(getRepoDataLog, null, 2));
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
      getRepoDataLog.owner = owner;
      getRepoDataLog.repo = repo;
      console.log("getRepoDataLog", JSON.stringify(getRepoDataLog, null, 2));
      return { owner, repo };
    }
  }
  console.log("getRepoDataLog", JSON.stringify(getRepoDataLog, null, 2));
  return {};
}
