import { Type } from "@sinclair/typebox";

function json(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    details: data,
  };
}

const githubPlugin = {
  id: "github",
  name: "GitHub",
  description:
    "Read code, create branches, commit files, and open PRs on GitHub repos. " +
    "PR-only policy — never merge PRs, only create them. " +
    "For code analysis, review, and contribution tasks, request model override to anthropic/claude-sonnet-4-5-20250929.",
  configSchema: {
    type: "object" as const,
    properties: {
      githubToken: { type: "string" as const },
      defaultOwner: { type: "string" as const },
    },
    required: ["githubToken"],
  },
  register(pluginApi: any) {
    const githubToken = pluginApi.pluginConfig?.githubToken;
    const defaultOwner = pluginApi.pluginConfig?.defaultOwner || "";

    if (!githubToken) {
      pluginApi.logger?.warn?.("githubToken not configured");
      return;
    }

    const BASE = "https://api.github.com";

    async function callGitHub(
      method: string,
      path: string,
      body?: any,
      extraHeaders?: Record<string, string>,
    ) {
      const options: RequestInit = {
        method,
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
          ...extraHeaders,
        },
      };
      if (body) {
        options.body = JSON.stringify(body);
      }
      const res = await fetch(`${BASE}${path}`, options);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API ${res.status}: ${text}`);
      }
      const text = await res.text();
      return text ? JSON.parse(text) : { success: true };
    }

    function resolveOwner(owner?: string): string {
      return owner || defaultOwner;
    }

    // ── List repos ──────────────────────────────────────────────────
    pluginApi.registerTool({
      name: "github_list_repos",
      label: "GitHub List Repos",
      description:
        "List repositories for the authenticated user. Can filter by type and sort order.",
      parameters: Type.Object({
        type: Type.Optional(
          Type.String({
            description:
              '"all" (default), "owner", "public", "private", "member"',
          }),
        ),
        sort: Type.Optional(
          Type.String({
            description:
              '"updated" (default), "created", "pushed", "full_name"',
          }),
        ),
        perPage: Type.Optional(
          Type.Number({ description: "Results per page (max 100, default 30)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const qs = new URLSearchParams();
          qs.set("type", params.type || "all");
          qs.set("sort", params.sort || "updated");
          qs.set("per_page", String(params.perPage || 30));
          const data = await callGitHub("GET", `/user/repos?${qs}`);
          const repos = data.map((r: any) => ({
            full_name: r.full_name,
            description: r.description,
            private: r.private,
            default_branch: r.default_branch,
            updated_at: r.updated_at,
            language: r.language,
            html_url: r.html_url,
          }));
          return json(repos);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Read a file ─────────────────────────────────────────────────
    pluginApi.registerTool({
      name: "github_read_file",
      label: "GitHub Read File",
      description:
        "Read the contents of a file from a GitHub repository. Returns the decoded file content.",
      parameters: Type.Object({
        owner: Type.Optional(
          Type.String({ description: "Repository owner (defaults to configured defaultOwner)" }),
        ),
        repo: Type.String({ description: "Repository name" }),
        path: Type.String({ description: "File path within the repository" }),
        ref: Type.Optional(
          Type.String({ description: "Branch, tag, or commit SHA (defaults to repo default branch)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const owner = resolveOwner(params.owner);
          const qs = params.ref ? `?ref=${encodeURIComponent(params.ref)}` : "";
          const data = await callGitHub(
            "GET",
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(params.repo)}/contents/${params.path}${qs}`,
          );
          if (data.type !== "file") {
            return json({ error: `Path is a ${data.type}, not a file. Use github_list_files instead.` });
          }
          const content = Buffer.from(data.content, "base64").toString("utf-8");
          return json({
            name: data.name,
            path: data.path,
            size: data.size,
            sha: data.sha,
            content,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── List files/dirs ─────────────────────────────────────────────
    pluginApi.registerTool({
      name: "github_list_files",
      label: "GitHub List Files",
      description:
        "List files and directories at a given path in a GitHub repository. Returns names, types, and sizes.",
      parameters: Type.Object({
        owner: Type.Optional(
          Type.String({ description: "Repository owner (defaults to configured defaultOwner)" }),
        ),
        repo: Type.String({ description: "Repository name" }),
        path: Type.Optional(
          Type.String({ description: 'Directory path (defaults to root "")' }),
        ),
        ref: Type.Optional(
          Type.String({ description: "Branch, tag, or commit SHA" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const owner = resolveOwner(params.owner);
          const dirPath = params.path || "";
          const qs = params.ref ? `?ref=${encodeURIComponent(params.ref)}` : "";
          const data = await callGitHub(
            "GET",
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(params.repo)}/contents/${dirPath}${qs}`,
          );
          if (!Array.isArray(data)) {
            return json({ error: "Path is a file, not a directory. Use github_read_file instead." });
          }
          const items = data.map((item: any) => ({
            name: item.name,
            type: item.type,
            size: item.size,
            path: item.path,
          }));
          return json(items);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Search code ─────────────────────────────────────────────────
    pluginApi.registerTool({
      name: "github_search_code",
      label: "GitHub Search Code",
      description:
        "Search for code across GitHub repositories. Supports GitHub search qualifiers like repo:, path:, language:, etc.",
      parameters: Type.Object({
        query: Type.String({
          description:
            'Search query with optional qualifiers. Examples: "useState repo:Adawodu/dynoclaw", "fetch language:typescript"',
        }),
        perPage: Type.Optional(
          Type.Number({ description: "Results per page (max 100, default 20)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const qs = new URLSearchParams();
          qs.set("q", params.query);
          qs.set("per_page", String(params.perPage || 20));
          const data = await callGitHub("GET", `/search/code?${qs}`);
          const results = (data.items || []).map((item: any) => ({
            name: item.name,
            path: item.path,
            repository: item.repository?.full_name,
            html_url: item.html_url,
          }));
          return json({
            total_count: data.total_count,
            results,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Create branch ───────────────────────────────────────────────
    pluginApi.registerTool({
      name: "github_create_branch",
      label: "GitHub Create Branch",
      description:
        "Create a new branch in a GitHub repository from a base reference (branch, tag, or SHA).",
      parameters: Type.Object({
        owner: Type.Optional(
          Type.String({ description: "Repository owner (defaults to configured defaultOwner)" }),
        ),
        repo: Type.String({ description: "Repository name" }),
        branch: Type.String({ description: "New branch name" }),
        from: Type.Optional(
          Type.String({ description: "Base branch/tag/SHA to branch from (defaults to repo default branch)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const owner = resolveOwner(params.owner);
          const repoPath = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(params.repo)}`;

          // Get the SHA of the base ref
          const baseBranch = params.from || "main";
          const refData = await callGitHub(
            "GET",
            `${repoPath}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
          );
          const sha = refData.object.sha;

          // Create the new branch
          const result = await callGitHub("POST", `${repoPath}/git/refs`, {
            ref: `refs/heads/${params.branch}`,
            sha,
          });

          return json({
            message: `Branch '${params.branch}' created from '${baseBranch}' (${sha.substring(0, 7)})`,
            ref: result.ref,
            sha: result.object.sha,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Commit a file ───────────────────────────────────────────────
    pluginApi.registerTool({
      name: "github_commit_file",
      label: "GitHub Commit File",
      description:
        "Create or update a single file in a GitHub repository. Performs a commit directly via the API.",
      parameters: Type.Object({
        owner: Type.Optional(
          Type.String({ description: "Repository owner (defaults to configured defaultOwner)" }),
        ),
        repo: Type.String({ description: "Repository name" }),
        path: Type.String({ description: "File path to create or update" }),
        content: Type.String({ description: "File content (plain text, will be base64-encoded)" }),
        message: Type.String({ description: "Commit message" }),
        branch: Type.String({ description: "Branch to commit to" }),
        sha: Type.Optional(
          Type.String({
            description:
              "SHA of the file being replaced (required for updates — get from github_read_file). Omit for new files.",
          }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const owner = resolveOwner(params.owner);
          const body: any = {
            message: params.message,
            content: Buffer.from(params.content).toString("base64"),
            branch: params.branch,
          };
          if (params.sha) {
            body.sha = params.sha;
          }
          const data = await callGitHub(
            "PUT",
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(params.repo)}/contents/${params.path}`,
            body,
          );
          return json({
            message: `File '${params.path}' committed to '${params.branch}'`,
            commit_sha: data.commit?.sha,
            html_url: data.content?.html_url,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── Create PR ───────────────────────────────────────────────────
    pluginApi.registerTool({
      name: "github_create_pr",
      label: "GitHub Create PR",
      description:
        "Open a pull request on a GitHub repository. PR-only policy: this tool creates PRs but never merges them.",
      parameters: Type.Object({
        owner: Type.Optional(
          Type.String({ description: "Repository owner (defaults to configured defaultOwner)" }),
        ),
        repo: Type.String({ description: "Repository name" }),
        title: Type.String({ description: "Pull request title" }),
        body: Type.Optional(Type.String({ description: "Pull request description (markdown)" })),
        head: Type.String({ description: "Branch with changes (source)" }),
        base: Type.Optional(
          Type.String({ description: 'Target branch (defaults to "main")' }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const owner = resolveOwner(params.owner);
          const data = await callGitHub(
            "POST",
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(params.repo)}/pulls`,
            {
              title: params.title,
              body: params.body || "",
              head: params.head,
              base: params.base || "main",
            },
          );
          return json({
            message: `PR #${data.number} created: ${data.title}`,
            number: data.number,
            html_url: data.html_url,
            state: data.state,
          });
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── List PRs ────────────────────────────────────────────────────
    pluginApi.registerTool({
      name: "github_list_prs",
      label: "GitHub List PRs",
      description: "List pull requests for a GitHub repository.",
      parameters: Type.Object({
        owner: Type.Optional(
          Type.String({ description: "Repository owner (defaults to configured defaultOwner)" }),
        ),
        repo: Type.String({ description: "Repository name" }),
        state: Type.Optional(
          Type.String({ description: '"open" (default), "closed", or "all"' }),
        ),
        perPage: Type.Optional(
          Type.Number({ description: "Results per page (max 100, default 10)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const owner = resolveOwner(params.owner);
          const qs = new URLSearchParams();
          qs.set("state", params.state || "open");
          qs.set("per_page", String(params.perPage || 10));
          const data = await callGitHub(
            "GET",
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(params.repo)}/pulls?${qs}`,
          );
          const prs = data.map((pr: any) => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            user: pr.user?.login,
            created_at: pr.created_at,
            html_url: pr.html_url,
            head: pr.head?.ref,
            base: pr.base?.ref,
          }));
          return json(prs);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });

    // ── List issues ─────────────────────────────────────────────────
    pluginApi.registerTool({
      name: "github_list_issues",
      label: "GitHub List Issues",
      description: "List issues for a GitHub repository.",
      parameters: Type.Object({
        owner: Type.Optional(
          Type.String({ description: "Repository owner (defaults to configured defaultOwner)" }),
        ),
        repo: Type.String({ description: "Repository name" }),
        state: Type.Optional(
          Type.String({ description: '"open" (default), "closed", or "all"' }),
        ),
        labels: Type.Optional(
          Type.String({ description: "Comma-separated label names to filter by" }),
        ),
        perPage: Type.Optional(
          Type.Number({ description: "Results per page (max 100, default 10)" }),
        ),
      }),
      async execute(_toolCallId: string, params: any) {
        try {
          const owner = resolveOwner(params.owner);
          const qs = new URLSearchParams();
          qs.set("state", params.state || "open");
          qs.set("per_page", String(params.perPage || 10));
          if (params.labels) qs.set("labels", params.labels);
          const data = await callGitHub(
            "GET",
            `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(params.repo)}/issues?${qs}`,
          );
          // Filter out PRs (GitHub returns PRs in issues endpoint)
          const issues = data
            .filter((item: any) => !item.pull_request)
            .map((issue: any) => ({
              number: issue.number,
              title: issue.title,
              state: issue.state,
              user: issue.user?.login,
              labels: issue.labels?.map((l: any) => l.name),
              created_at: issue.created_at,
              html_url: issue.html_url,
            }));
          return json(issues);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : String(err) });
        }
      },
    });
  },
};

export default githubPlugin;
