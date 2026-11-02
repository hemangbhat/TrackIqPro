import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { computeJobFit } from "../../lib/career-fit";
import { demoJobs, DEMO_PROFILE } from "../../lib/demo-data";

// Link preview for shared TrackIQ URLs: the landing page's thesis and the same
// real, engine-computed sample score its hero draws.
export const alt = "TrackIQ — every score shows its work";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
    // The site's display face, so the preview reads like the page (assets/fonts/README.md).
    const archivo = await readFile(path.join(process.cwd(), "assets/fonts/Archivo-ExtraBold.ttf"));
    const fit = computeJobFit(demoJobs[0], DEMO_PROFILE);
    const gains = fit.whatHelped.filter((r) => r.impact > 0);
    let running = 0;

    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    background: "#f7f7f4",
                    fontFamily: "Archivo",
                    color: "#111111",
                    padding: 64,
                    borderTop: "16px solid #111111",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>
                    <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>TrackIQ</div>
                    <div style={{ display: "flex", flexDirection: "column", fontSize: 96, fontWeight: 800, lineHeight: 0.9, letterSpacing: -3.8 }}>
                        <span>Every score</span>
                        <span>shows its work.</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "flex-end", height: 120, gap: 14, borderBottom: "4px solid #111111" }}>
                        {gains.map((r) => {
                            const bottom = running;
                            running += r.impact;
                            return (
                                <div
                                    key={r.label}
                                    style={{
                                        display: "flex",
                                        width: 110,
                                        height: (r.impact + bottom) * 1.2,
                                        flexDirection: "column",
                                        justifyContent: "flex-start",
                                    }}
                                >
                                    <div style={{ display: "flex", height: r.impact * 1.2, background: "#111111" }} />
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        width: 330,
                        marginLeft: 48,
                        background: "#2f3bff",
                        color: "#ffffff",
                        padding: 36,
                    }}
                >
                    <span style={{ fontSize: 24, fontWeight: 700 }}>Job fit on sample data</span>
                    <span style={{ fontSize: 220, fontWeight: 800, lineHeight: 0.8, letterSpacing: -9 }}>{fit.score}</span>
                    <span style={{ fontSize: 22, color: "#dfe1ff" }}>Out of 100, with every reason shown.</span>
                </div>
            </div>
        ),
        { ...size, fonts: [{ name: "Archivo", data: archivo, weight: 800, style: "normal" }] }
    );
}
