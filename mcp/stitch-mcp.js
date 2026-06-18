#!/usr/bin/env node

/**
 * stitch-mcp (patched local copy)
 *
 * Based on stitch-mcp by Aakash Kargathara (Apache-2.0).
 * Patch: Google's Stitch API returns tool input schemas that use JSON-Schema
 * `$ref` -> `#/$defs/...`. Some MCP clients (e.g. Kiro) cannot dereference
 * those, which makes the WHOLE tools/list registration fail
 * ("can't resolve reference #/$defs/ScreenInstance"). This copy inlines all
 * `$defs` (and strips `x-*` vendor keys) so every tool registers cleanly.
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { exec } = require("child_process");
const { promisify } = require("util");
const fs = require("fs");
const path = require("path");
const os = require("os");
const fetch = require("node-fetch");

const execAsync = promisify(exec);

const STITCH_URL = "https://stitch.googleapis.com/mcp";
const TIMEOUT_MS = 180000;

const log = {
    info: (msg) => console.error(`[stitch-mcp] i  ${msg}`),
    success: (msg) => console.error(`[stitch-mcp] ok ${msg}`),
    warn: (msg) => console.error(`[stitch-mcp] !  ${msg}`),
    error: (msg) => console.error(`[stitch-mcp] x  ${msg}`),
};

async function runGcloud(params) {
    const isWin = os.platform() === "win32";
    const command = isWin ? "gcloud.cmd" : "gcloud";
    try {
        const { stdout } = await execAsync(`${command} ${params}`, {
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
            timeout: 10000,
            windowsHide: true,
        });
        return stdout.trim();
    } catch (error) {
        const msg = error.message || error.toString();
        if (msg.includes("ENOENT") || msg.includes("not recognized")) {
            throw new Error("gcloud CLI not found. Please install Google Cloud SDK.");
        }
        if (msg.includes("Reauthentication required") || msg.includes("Credentials")) {
            throw new Error("Authentication expired. Run: gcloud auth application-default login");
        }
        throw error;
    }
}

async function getAccessToken() {
    return runGcloud("auth application-default print-access-token");
}

async function getProjectId() {
    if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
    if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
    try {
        const project = await runGcloud("config get-value project");
        if (project && project !== "(unset)") return project;
    } catch (e) { /* ignore */ }
    throw new Error("Project ID not found. Set GOOGLE_CLOUD_PROJECT or run: gcloud config set project YOUR_PROJECT");
}

/** Remove non-standard x-* vendor keywords. */
function sanitizeSchema(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeSchema);
    const cleaned = {};
    for (const key of Object.keys(obj)) {
        if (key.startsWith("x-")) continue;
        cleaned[key] = sanitizeSchema(obj[key]);
    }
    return cleaned;
}

/**
 * Inline all local `$ref: "#/$defs/Name"` (and "#/definitions/Name") pointers
 * using the schema's own `$defs`/`definitions`, then drop those containers.
 * Self/cyclic references beyond a depth cap collapse to an open object so the
 * resulting schema is always finite and dereferenced.
 */
function inlineDefs(rootSchema) {
    if (!rootSchema || typeof rootSchema !== "object") return rootSchema;
    const defs = { ...(rootSchema.$defs || {}), ...(rootSchema.definitions || {}) };

    const resolve = (node, depth) => {
        if (!node || typeof node !== "object") return node;
        if (Array.isArray(node)) return node.map((n) => resolve(n, depth));

        if (typeof node.$ref === "string") {
            const m = node.$ref.match(/^#\/(?:\$defs|definitions)\/(.+)$/);
            if (m && defs[m[1]]) {
                if (depth > 8) return { type: "object" }; // cycle guard
                const { $ref, ...rest } = node;
                return { ...resolve(defs[m[1]], depth + 1), ...resolve(rest, depth + 1) };
            }
            // Unknown/external ref: drop it to keep the schema resolvable.
            const { $ref, ...rest } = node;
            return resolve(rest, depth);
        }

        const out = {};
        for (const key of Object.keys(node)) {
            if (key === "$defs" || key === "definitions") continue;
            out[key] = resolve(node[key], depth);
        }
        return out;
    };

    return resolve(rootSchema, 0);
}

function normalizeInputSchema(schema) {
    const cleaned = inlineDefs(sanitizeSchema(schema));
    if (!cleaned || typeof cleaned !== "object" || !cleaned.type) {
        return { type: "object", properties: {} };
    }
    return cleaned;
}

async function callStitchAPI(method, params, projectId) {
    const token = await getAccessToken();
    const body = { jsonrpc: "2.0", method, params, id: Date.now() };
    log.info(`-> ${method}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const response = await fetch(STITCH_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`,
                "X-Goog-User-Project": projectId,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!response.ok) {
            const text = await response.text();
            let errorCode = -32000;
            if (response.status === 400) errorCode = -32602;
            if (response.status === 401 || response.status === 403) errorCode = -32001;
            if (response.status === 404) errorCode = -32601;
            throw { code: errorCode, message: `HTTP ${response.status}: ${text}` };
        }
        const data = await response.json();
        log.success(`Completed ${method}`);
        return data;
    } catch (error) {
        clearTimeout(timeout);
        if (error.name === "AbortError") throw { code: -32002, message: "Request timeout (3 minutes)" };
        if (error.code) throw error;
        throw { code: -32603, message: error.message || "Internal error" };
    }
}

const CUSTOM_TOOLS = [
    {
        name: "fetch_screen_code",
        description: "Retrieves the actual HTML/Code content of a screen. Use this to SEE the code.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "The project ID" },
                screenId: { type: "string", description: "The screen ID" },
            },
            required: ["projectId", "screenId"],
        },
    },
    {
        name: "fetch_screen_image",
        description: "Retrieves and saves the screenshot/preview image of a screen.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "The project ID" },
                screenId: { type: "string", description: "The screen ID" },
            },
            required: ["projectId", "screenId"],
        },
    },
    {
        name: "extract_design_context",
        description: "Scans a screen and extracts its 'Design DNA' (Tailwind tokens, header/nav components) for consistent generation.",
        inputSchema: {
            type: "object",
            properties: {
                projectId: { type: "string", description: "The project ID" },
                screenId: { type: "string", description: "The screen ID" },
            },
            required: ["projectId", "screenId"],
        },
    },
];

async function main() {
    try {
        log.info(`Starting patched Stitch MCP Server (${os.platform()})`);
        const projectId = await getProjectId();
        log.info(`Project: ${projectId}`);
        try {
            await getAccessToken();
            log.success("Auth verified");
        } catch (e) {
            throw new Error("Authentication failed. Run: gcloud auth application-default login");
        }

        const server = new Server(
            { name: "stitch", version: "1.3.2-patched" },
            { capabilities: { tools: {} } }
        );

        const {
            ListToolsRequestSchema,
            CallToolRequestSchema,
        } = require("@modelcontextprotocol/sdk/types.js");

        server.setRequestHandler(ListToolsRequestSchema, async () => {
            try {
                const result = await callStitchAPI("tools/list", {}, projectId);
                const rawTools = result.result ? result.result.tools : [];
                const tools = rawTools.map((tool) => ({
                    ...tool,
                    inputSchema: tool.inputSchema
                        ? normalizeInputSchema(tool.inputSchema)
                        : { type: "object", properties: {} },
                }));
                return { tools: [...tools, ...CUSTOM_TOOLS] };
            } catch (error) {
                log.error(`Tools list failed: ${error.message}`);
                return { tools: [...CUSTOM_TOOLS] };
            }
        });

        server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            const getScreen = () =>
                callStitchAPI(
                    "tools/call",
                    { name: "get_screen", arguments: { projectId: args.projectId, screenId: args.screenId } },
                    projectId
                );

            if (name === "fetch_screen_code") {
                try {
                    const screenRes = await getScreen();
                    if (!screenRes.result) throw new Error("Could not fetch screen details");
                    let downloadUrl = null;
                    const findUrl = (obj) => {
                        if (downloadUrl || !obj || typeof obj !== "object") return;
                        if (obj.downloadUrl) { downloadUrl = obj.downloadUrl; return; }
                        for (const key in obj) findUrl(obj[key]);
                    };
                    findUrl(screenRes.result);
                    if (!downloadUrl) return { content: [{ type: "text", text: "No code download URL found." }], isError: true };
                    const res = await fetch(downloadUrl);
                    if (!res.ok) throw new Error(`Failed to download: ${res.status}`);
                    return { content: [{ type: "text", text: await res.text() }] };
                } catch (err) {
                    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
                }
            }

            if (name === "fetch_screen_image") {
                try {
                    const screenRes = await getScreen();
                    if (!screenRes.result) throw new Error("Could not fetch screen details");
                    let imageUrl = null;
                    const isImgUrl = (s) =>
                        typeof s === "string" &&
                        (s.includes(".png") || s.includes(".jpg") ||
                            (s.includes("googleusercontent.com") && !s.includes("contribution.usercontent")));
                    const findImg = (obj) => {
                        if (imageUrl || !obj || typeof obj !== "object") return;
                        if (obj.screenshot && obj.screenshot.downloadUrl) { imageUrl = obj.screenshot.downloadUrl; return; }
                        if (obj.downloadUrl && isImgUrl(obj.downloadUrl)) { imageUrl = obj.downloadUrl; return; }
                        if (obj.uri && isImgUrl(obj.uri)) { imageUrl = obj.uri; return; }
                        for (const key in obj) findImg(obj[key]);
                    };
                    findImg(screenRes.result);
                    if (!imageUrl) return { content: [{ type: "text", text: "No image URL found." }], isError: true };
                    const imgRes = await fetch(imageUrl);
                    if (!imgRes.ok) throw new Error(`Failed to download image: ${imgRes.status}`);
                    const buffer = Buffer.from(await imgRes.arrayBuffer());
                    const fileName = `screen_${args.screenId}.png`;
                    fs.writeFileSync(path.join(process.cwd(), fileName), buffer);
                    return {
                        content: [
                            { type: "text", text: `Image saved to ${fileName}` },
                            { type: "image", data: buffer.toString("base64"), mimeType: "image/png" },
                        ],
                    };
                } catch (err) {
                    return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
                }
            }

            if (name === "extract_design_context") {
                try {
                    const screenRes = await getScreen();
                    if (!screenRes.result) throw new Error("Could not fetch screen details");
                    let html = null;
                    const findHtml = (obj) => {
                        if (html || !obj || typeof obj !== "object") return;
                        if (obj.htmlCode && obj.htmlCode.content) { html = obj.htmlCode.content; return; }
                        for (const k in obj) findHtml(obj[k]);
                    };
                    findHtml(screenRes.result);
                    if (!html) return { content: [{ type: "text", text: "HTML content not found in screen data." }], isError: true };

                    let prompt = "Based on the following design system:\n\n";
                    const tw = html.match(/tailwind\.config\s*=\s*({[\s\S]*?})\s*<\/script>/);
                    if (tw) prompt += `### Design Tokens (Tailwind)\n\`\`\`json\n${tw[1].replace(/\s+/g, " ").trim()}\n\`\`\`\n\n`;
                    const sections = [
                        { name: "Header/TopBar", regex: /<!--\s*TopAppBar\s*-->([\s\S]*?)<!--/ },
                        { name: "Bottom Navigation", regex: /<!--\s*BottomNavigation\s*-->([\s\S]*?)<!--/ },
                    ];
                    let found = 0;
                    sections.forEach((s) => {
                        const m = html.match(s.regex);
                        if (m) { found++; prompt += `### ${s.name}\n\`\`\`html\n${m[1].trim()}\n\`\`\`\n\n`; }
                    });
                    if (found === 0) prompt += "### UI Style\n(No explicit Header/Nav markers found.)\n";
                    return { content: [{ type: "text", text: prompt }] };
                } catch (err) {
                    return { content: [{ type: "text", text: `Error extracting context: ${err.message}` }], isError: true };
                }
            }

            // Pass-through to Google Stitch for all other (listed) tools.
            try {
                const result = await callStitchAPI("tools/call", { name, arguments: args || {} }, projectId);
                if (result.result) {
                    if (result.result.content && Array.isArray(result.result.content)) return result.result;
                    return { content: [{ type: "text", text: JSON.stringify(result.result, null, 2) }] };
                }
                if (result.error) return { content: [{ type: "text", text: `API Error: ${result.error.message}` }], isError: true };
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            } catch (error) {
                return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
            }
        });

        server.onerror = (err) => log.error(`Server error: ${err}`);
        await server.connect(new StdioServerTransport());
        log.success("Patched server ready on stdio");
    } catch (error) {
        log.error(`Fatal Startup Error: ${error.message}`);
        process.exit(1);
    }
}

main();
