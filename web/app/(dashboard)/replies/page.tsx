import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db/mongoose";
import Reply from "@/lib/db/models/reply";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

const TYPE_STYLE: Record<string, { bg: string; color: string; label: string; border: string }> = {
  positive:  { bg: "rgba(100,190,80,0.04)", color: "#2d6b1a", label: "Interested", border: "3px solid #64be50" },
  interview: { bg: "rgba(200,224,50,0.04)", color: "var(--lime-dark)", label: "Interview", border: "3px solid var(--lime)" },
  rejection: { bg: "transparent", color: "var(--ink-3)", label: "Rejected", border: "0.5px solid var(--border)" },
  automated: { bg: "transparent", color: "var(--ink-3)", label: "Auto-reply", border: "0.5px solid var(--border)" },
  unknown:   { bg: "transparent", color: "var(--ink-3)", label: "Unclassified", border: "0.5px solid var(--border)" },
};

export default async function RepliesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  await connectDB();
  const replies = await Reply.find({ userId }).sort({ receivedAt: -1 }).lean();

  const positive  = replies.filter((r) => r.classification === "positive" || r.classification === "interview_invite");
  const rejections = replies.filter((r) => r.classification === "rejection");
  const automated  = replies.filter((r) => r.classification === "automated");

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        {replies.length} total · {positive.length} positive · {rejections.length} rejections · {automated.length} automated
      </p>

      {replies.length === 0 ? (
        <div className="card py-20 text-center">
          <div className="text-sm font-medium mb-1" style={{ color: "var(--ink-2)" }}>No replies yet</div>
          <div className="text-xs" style={{ color: "var(--ink-3)" }}>
            As companies respond to your applications, replies will appear here — classified automatically.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-3">
          {/* Main reply feed */}
          <div className="col-span-8 space-y-2">
            {replies.map((r) => {
              const style = TYPE_STYLE[r.classification] ?? TYPE_STYLE.unknown;
              const isImportant = r.classification === "positive" || r.classification === "interview_invite";
              return (
                <div
                  key={r._id.toString()}
                  className={`rounded-2xl p-4 cursor-pointer transition-all ${isImportant ? "" : "opacity-60 hover:opacity-80"}`}
                  style={{
                    background: isImportant ? style.bg : "var(--card)",
                    border: style.border,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="inline-flex px-2 py-0.5 rounded text-2xs font-mono font-medium"
                          style={{ background: `${style.color}18`, color: style.color }}
                        >
                          {style.label}
                        </span>
                        <span className="text-xs font-medium truncate" style={{ color: "var(--ink)" }}>
                          {r.fromName || r.fromEmail}
                        </span>
                      </div>
                      {r.subject && (
                        <div className="text-sm font-medium mb-1 truncate" style={{ color: "var(--ink)" }}>{r.subject}</div>
                      )}
                      <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--ink-2)" }}>
                        {r.bodyText}
                      </p>
                    </div>
                    <div className="text-2xs font-mono flex-shrink-0" style={{ color: "var(--ink-3)" }}>
                      {format(new Date(r.receivedAt), "MMM d, HH:mm")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Stats sidebar */}
          <div className="col-span-4 space-y-3">
            <div className="card">
              <div className="text-2xs uppercase tracking-widest font-medium mb-4" style={{ color: "var(--ink-3)" }}>
                Reply breakdown
              </div>
              {[
                { label: "Interested / Interview", count: positive.length, color: "#64be50" },
                { label: "Rejections", count: rejections.length, color: "#dc4646" },
                { label: "Automated", count: automated.length, color: "var(--ink-3)" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between mb-3 last:mb-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                    <span className="text-xs" style={{ color: "var(--ink-2)" }}>{row.label}</span>
                  </div>
                  <span className="text-sm font-bold font-mono" style={{ color: "var(--ink)" }}>{row.count}</span>
                </div>
              ))}
            </div>

            <div className="card-off rounded-2xl p-4">
              <div className="text-2xs uppercase tracking-widest font-medium mb-2" style={{ color: "var(--ink-3)" }}>
                AI classification
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
                Every reply is classified by Claude AI — distinguishing genuine recruiter interest from auto-responders. You only get notified on real interest.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
