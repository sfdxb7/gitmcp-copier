"use client";

import React from "react";
import {
  ArrowRight,
  Github,
  GitBranch,
  Code,
  Globe,
  Zap,
  Lock,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-gray-800 [mask-image:linear-gradient(0deg,rgba(17,24,39,0.7),rgba(17,24,39,0.5))] bg-[length:20px_20px]"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 sm:py-16">
          <div className="text-center">
            <div className="flex justify-center">
              <img src="/icon.png" alt="GitMCP Logo" className="h-auto w-80" />
            </div>
            <p className="max-w-3xl mx-auto text-3xl text-gray-300 sm:text-3xl ">
              Instantly create an MCP server for any GitHub repository
            </p>
          </div>
        </div>
      </div>

      {/* What is GitMCP Section */}
      <section className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">What is GitMCP?</h2>
            <p className="mt-4 text-xl text-gray-300 max-w-3xl mx-auto">
              GitMCP creates a dedicated Model Context Protocol (MCP) server for
              any GitHub repository, enabling AI assistants to understand your
              code in context.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Code Understanding</h3>
              <p className="text-gray-400">
                AI assistants gain deep context of your codebase structure,
                making their responses more accurate and relevant.
              </p>
            </div>

            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-emerald-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Instant Setup</h3>
              <p className="text-gray-400">
                No complex configuration needed. Just point to your GitHub
                repository and connect your AI tools.
              </p>
            </div>

            <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
              <div className="w-12 h-12 bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Universal Access</h3>
              <p className="text-gray-400">
                Works seamlessly with any public GitHub repository and GitHub
                Pages, making your documentation and code accessible to AI
                tools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold">How It Works</h2>
            <div className="mt-6 max-w-3xl mx-auto">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-8 flex items-center">
                <div className="flex-1 flex items-center justify-end text-gray-300 text-lg font-mono px-4">
                  github.com/username/repo
                </div>
                <div className="mx-4 text-gray-500">→</div>
                <div className="flex-1 flex items-center text-emerald-400 text-lg font-mono px-4">
                  gitmcp.io/username/repo
                </div>
              </div>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                Simply change the domain from{" "}
                <span className="text-gray-200 font-semibold">github.com</span>{" "}
                or{" "}
                <span className="text-gray-200 font-semibold">github.io</span>{" "}
                to{" "}
                <span className="text-emerald-400 font-semibold">
                  gitmcp.io
                </span>{" "}
                and get instant AI context for any GitHub repository.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl hover:shadow-emerald-900/20">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mb-5 font-bold mx-auto">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">
                Create MCP URL
              </h3>
              <p className="text-gray-400 text-center">
                Replace{" "}
                <code className="bg-gray-700 px-1.5 py-0.5 rounded">
                  github.com
                </code>{" "}
                with{" "}
                <code className="bg-gray-700 px-1.5 py-0.5 rounded text-emerald-400">
                  gitmcp.io
                </code>{" "}
                in any repository URL.
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl hover:shadow-emerald-900/20">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mb-5 font-bold mx-auto">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">
                Add to AI Assistant
              </h3>
              <p className="text-gray-400 text-center">
                Configure your AI tool to use the GitMCP URL as a custom MCP
                server.
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 transform transition-all duration-300 hover:translate-y-[-5px] hover:shadow-xl hover:shadow-emerald-900/20">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center mb-5 font-bold mx-auto">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3 text-center">
                Enhanced AI Coding
              </h3>
              <p className="text-gray-400 text-center">
                Your AI now understands your repository's context for more
                accurate and helpful responses.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compatible With Section */}
      <section className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Compatible With</h2>
            <p className="mt-4 text-xl text-gray-300 max-w-3xl mx-auto">
              Works with all popular MCP-compatible AI tools
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-16 items-center">
            <div className="flex flex-col items-center">
              <a
                href="https://claude.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="group hover:opacity-90 transition-opacity flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-lg flex items-center justify-center mb-3 group-hover:from-gray-650 group-hover:to-gray-750 transition-all">
                  <img
                    src="https://claude.ai/favicon.ico"
                    alt="Claude"
                    className="h-10 w-10"
                  />
                </div>
                <span className="text-gray-200 text-lg font-medium">
                  Claude
                </span>
              </a>
            </div>

            <div className="flex flex-col items-center">
              <a
                href="https://cursor.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group hover:opacity-90 transition-opacity flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-lg flex items-center justify-center mb-3 group-hover:from-gray-650 group-hover:to-gray-750 transition-all">
                  <img
                    src="https://www.cursor.com/favicon.ico"
                    alt="Cursor"
                    className="h-10 w-10"
                  />
                </div>
                <span className="text-gray-200 text-lg font-medium">
                  Cursor
                </span>
              </a>
            </div>

            <div className="flex flex-col items-center">
              <a
                href="https://codeium.com/windsurf"
                target="_blank"
                rel="noopener noreferrer"
                className="group hover:opacity-90 transition-opacity flex flex-col items-center"
              >
                <div className="w-20 h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl shadow-lg flex items-center justify-center mb-3 group-hover:from-gray-650 group-hover:to-gray-750 transition-all">
                  <img
                    src="https://codeium.com/favicon.ico"
                    alt="Windsurf"
                    className="h-10 w-10"
                  />
                </div>
                <span className="text-gray-200 text-lg font-medium">
                  Windsurf
                </span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="text-2xl font-bold mb-2">
                <span className="text-blue-400">Git</span>
                <span className="text-emerald-400">MCP</span>
              </div>
              <p className="text-gray-500">
                © 2024 GitMCP. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
