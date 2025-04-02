"use client";
import React, { useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";

export default function Content({
  subdomain,
  path,
  owner,
  repo,
  url,
}: {
  subdomain?: string;
  path?: string;
  owner?: string;
  repo?: string;
  url?: string;
}) {
  const description: React.ReactNode = (() => {
    if (subdomain && path) {
      return (
        <div>
          <span> for the</span>{" "}
          <strong className="text-emerald-500">
            {subdomain}/{path}
          </strong>{" "}
          <span>GitHub Pages</span>
        </div>
      );
    } else if (owner && repo) {
      return (
        <div>
          <span> for the</span>{" "}
          <strong className="text-emerald-500">
            {owner}/{repo}
          </strong>{" "}
          <span>GitHub repository</span>
        </div>
      );
    }
    return <div>Documentation MCP</div>;
  })();

  const serverName = (repo ?? path) ? `${repo ?? path} Docs` : "MCP Docs";

  const [copied, setCopied] = useState(false);

  const copyUrl = () => {
    navigator.clipboard.writeText(url || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col items-center p-8">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 relative inline-block">
            <span className="text-blue-800">GitHub Documentation MCP</span>
          </h1>
          <div className="mt-4 text-xl text-slate-700">{description}</div>
          <div className="flex items-center justify-center mt-6">
            <div className="h-0.5 w-12 bg-slate-300"></div>
            <div className="mx-4">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12C2 16.418 4.865 20.166 8.839 21.489C9.339 21.581 9.5 21.278 9.5 21.017C9.5 20.756 9.5 20.178 9.5 19.317C6.739 19.939 6.139 17.917 6.139 17.917C5.699 16.778 5.039 16.478 5.039 16.478C4.119 15.839 5.099 15.839 5.099 15.839C6.099 15.917 6.659 16.917 6.659 16.917C7.5 18.5 9.099 17.958 9.5 17.698C9.6 17.078 9.859 16.65 10.14 16.417C7.98 16.166 5.699 15.306 5.699 11.489C5.699 10.389 6.099 9.489 6.7 8.789C6.58 8.539 6.22 7.489 6.8 6.122C6.8 6.122 7.62 5.85 9.5 7.122C10.3 6.872 11.15 6.75 12 6.75C12.85 6.75 13.7 6.872 14.5 7.122C16.38 5.85 17.2 6.122 17.2 6.122C17.78 7.489 17.42 8.539 17.3 8.789C17.9 9.489 18.3 10.389 18.3 11.489C18.3 15.306 16.02 16.166 13.86 16.417C14.14 16.65 14.4 17.139 14.4 17.839C14.4 18.917 14.4 20.656 14.4 21.017C14.4 21.278 14.56 21.581 15.06 21.489C19.137 20.166 22 16.418 22 12C22 6.477 17.523 2 12 2Z"
                  fill="#2563EB"
                />
              </svg>
            </div>
            <div className="h-0.5 w-12 bg-slate-300"></div>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6 my-8 border border-slate-200">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            Server URL
          </h2>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-between mb-2 relative">
            <code className="text-slate-700 pr-10 break-all">{url}</code>
            <button
              onClick={copyUrl}
              className="absolute right-2 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
              aria-label="Copy URL"
            >
              {copied ? (
                <Check className="w-5 h-5 text-emerald-500" />
              ) : (
                <ClipboardCopy className="w-5 h-5 text-blue-600" />
              )}
            </button>
          </div>
          {copied && (
            <p className="text-emerald-500 text-sm">URL copied to clipboard!</p>
          )}
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6 my-8 border border-slate-200">
          <h2 className="text-xl font-semibold text-blue-800 mb-4">
            Integration Examples
          </h2>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-blue-600 mb-2">
              {" "}
              <img
                src="https://www.cursor.com/favicon.ico"
                alt="Cursor"
                className="h-6 w-6 mr-2 inline-block"
              />{" "}
              Cursor
            </h3>
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
              <p className="text-sm text-slate-700 mb-2">
                To add this MCP to Cursor, update your{" "}
                <code className="bg-slate-200 px-1.5 py-0.5 rounded text-blue-700">
                  ~/.cursor/mcp.json
                </code>
                :
              </p>
              <pre className="bg-slate-800 text-slate-100 p-3 rounded-md text-sm overflow-x-auto">
                {`{
  "mcpServers": {
    "${serverName}": {
      "url": "${url}"
    }
  }
}`}
              </pre>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-blue-600 mb-2">
              {" "}
              <img
                src="https://claude.ai/favicon.ico"
                alt="Claude"
                className="h-6 w-6 mr-2 inline-block"
              />{" "}
              Claude Desktop
            </h3>
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
              <p className="text-sm text-slate-700 mb-2">
                To add this MCP to Claude Desktop, update your{" "}
                <code className="bg-slate-200 px-1.5 py-0.5 rounded text-blue-700">
                  claude_desktop_config.json
                </code>
                :
              </p>
              <pre className="bg-slate-800 text-slate-100 p-3 rounded-md text-sm overflow-x-auto">
                {`{
  "mcpServers": {
    "${serverName}": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "${url}"
      ]
    }
  }
}`}
              </pre>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-blue-600 mb-2">
              {" "}
              <img
                src="https://codeium.com/favicon.ico"
                alt="Windsurf"
                className="h-6 w-6 mr-2 inline-block"
              />{" "}
              Windsurf
            </h3>
            <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
              <p className="text-sm text-slate-700 mb-2">
                To add this MCP to Windsurf, update your{" "}
                <code className="bg-slate-200 px-1.5 py-0.5 rounded text-blue-700">
                  ~/.codeium/windsurf/mcp_config.json
                </code>
                :
              </p>
              <pre className="bg-slate-800 text-slate-100 p-3 rounded-md text-sm overflow-x-auto">
                {`{
  "mcpServers": {
    "${serverName}": {
      "serverUrl": "${url}"
    }
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center space-x-8">
          <a
            href="https://claude.ai"
            className="text-blue-600 hover:text-blue-800 flex items-center transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://claude.ai/favicon.ico"
              alt="Claude"
              className="h-6 w-6 mr-2"
            />
            Claude
          </a>
          <a
            href="https://cursor.com"
            className="text-blue-600 hover:text-blue-800 flex items-center transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://www.cursor.com/favicon.ico"
              alt="Cursor"
              className="h-6 w-6 mr-2"
            />
            Cursor
          </a>
          <a
            href="https://codeium.com/windsurf"
            className="text-blue-600 hover:text-blue-800 flex items-center transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src="https://codeium.com/favicon.ico"
              alt="Windsurf"
              className="h-6 w-6 mr-2"
            />
            Windsurf
          </a>
        </div>
      </div>
    </div>
  );
}
