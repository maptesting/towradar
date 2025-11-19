// pages/team.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Nav from "../components/Nav";
import { supabase } from "../lib/supabaseClient";

type TeamMember = {
  id: string;
  user_id: string;
  role: "owner" | "driver" | "dispatcher";
  created_at: string;
};

export default function TeamPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"driver" | "dispatcher">("driver");

  // Auth check
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) {
        router.replace("/auth");
        return;
      }
      setUserId(user.id);
      setAuthChecked(true);
    })();
  }, [router]);

  // Load company and role
  useEffect(() => {
    if (!authChecked || !userId) return;

    (async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Company load error:", error);
        setErrorMsg("Error loading company profile.");
        return;
      }

      if (!data) {
        setErrorMsg("No company profile found. Please set up your company first.");
        return;
      }

      setCompanyId(data.id);

      // Get user role
      const { data: roleData } = await supabase
        .from("company_users")
        .select("role")
        .eq("company_id", data.id)
        .eq("user_id", userId)
        .single();

      if (roleData) {
        setUserRole(roleData.role);
      }
    })();
  }, [authChecked, userId]);

  // Load team members
  useEffect(() => {
    if (!companyId) return;
    loadTeam();
  }, [companyId]);

  async function loadTeam() {
    if (!companyId) return;
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("company_users")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Team load error:", error);
      setErrorMsg("Error loading team members.");
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    // For now, just show user IDs (email lookup would require server-side API)
    // In production, you'd fetch emails from a server endpoint
    setTeamMembers(data || []);
    setLoading(false);
  }

  async function handleInvite() {
    // For now, just show info message - email integration not implemented yet
    alert(
      `📧 Email invitations coming soon!\n\nFor now, to add "${inviteEmail}" as a ${inviteRole}:\n\n1. Have them sign up at ${window.location.origin}/auth\n2. They'll need to create their own company first\n3. Once they have an account, you can coordinate manually\n\nFull team invitation system will be added in a future update!`
    );
    setShowAddModal(false);
    setInviteEmail("");
  }

  async function handleRemoveMember(memberId: string) {
    if (
      !confirm(
        "Are you sure you want to remove this member from your team?"
      )
    )
      return;

    setLoading(true);
    const { error } = await supabase
      .from("company_users")
      .delete()
      .eq("id", memberId);

    if (error) {
      console.error("Remove error:", error);
      setErrorMsg("Error removing team member.");
    } else {
      loadTeam();
    }

    setLoading(false);
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    setLoading(true);
    const { error } = await supabase
      .from("company_users")
      .update({ role: newRole })
      .eq("id", memberId);

    if (error) {
      console.error("Role update error:", error);
      setErrorMsg("Error updating role.");
    } else {
      loadTeam();
    }

    setLoading(false);
  }

  const roleColors = {
    owner: "bg-purple-500/10 text-purple-300 border-purple-500/40",
    driver: "bg-blue-500/10 text-blue-300 border-blue-500/40",
    dispatcher: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  };

  const roleLabels = {
    owner: "Owner",
    driver: "Driver",
    dispatcher: "Dispatcher",
  };

  const isOwner = userRole === "owner";

  return (
    <div className="min-h-screen text-slate-50 flex flex-col">
      <Nav />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Team Management</h1>
              <p className="text-base text-slate-400 mt-2">
                Manage your team members and roles
              </p>
            </div>
            {isOwner && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-3 rounded-lg gradient-emerald text-white font-semibold shadow-glow hover:scale-105 transition-transform"
              >
                + Invite Member
              </button>
            )}
          </header>

          {!isOwner && (
            <p className="text-sm text-yellow-400 border border-yellow-500/40 bg-yellow-950/40 rounded-md px-3 py-2">
              Only owners can manage team members.
            </p>
          )}

          {errorMsg && (
            <div className="text-sm text-amber-300 border border-amber-500/40 bg-amber-950/40 rounded-md px-3 py-2 whitespace-pre-line">
              {errorMsg}
            </div>
          )}

          <div className="glass-strong rounded-2xl overflow-hidden border border-slate-700/50">
            <table className="w-full">
              <thead className="glass-strong border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300 uppercase tracking-wider">
                    Joined
                  </th>
                  {isOwner && (
                    <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {teamMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-100 font-mono">{member.user_id}</p>
                      <p className="text-sm text-emerald-400 font-medium mt-1">
                        {member.user_id === userId && "(You)"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {isOwner && member.user_id !== userId ? (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            handleChangeRole(member.id, e.target.value)
                          }
                          className="px-3 py-2 rounded-lg glass border border-slate-700/50 text-sm font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                          <option value="driver">Driver</option>
                          <option value="dispatcher">Dispatcher</option>
                          <option value="owner">Owner</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex px-3 py-1.5 rounded-full text-sm font-semibold border ${
                            roleColors[member.role]
                          }`}
                        >
                          {roleLabels[member.role]}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-base text-slate-300">
                      {new Date(member.created_at).toLocaleDateString()}
                    </td>
                    {isOwner && (
                      <td className="px-6 py-4 text-right">
                        {member.user_id !== userId && (
                          <button
                            onClick={() =>
                              handleRemoveMember(member.id)
                            }
                            className="px-4 py-2 rounded-lg glass border border-rose-500/50 hover:bg-rose-500/10 text-rose-300 text-sm font-medium transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}

                {teamMembers.length === 0 && (
                  <tr>
                    <td
                      colSpan={isOwner ? 4 : 3}
                      className="px-4 py-8 text-center text-slate-400"
                    >
                      No team members yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="glass-strong rounded-2xl p-6 border border-slate-700/50">
            <h3 className="text-lg font-bold text-slate-200 mb-4">
              Role Descriptions
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li>
                <span className="font-medium text-purple-300">Owner:</span> Full
                access to manage company, fleet, team, and incidents
              </li>
              <li>
                <span className="font-medium text-blue-300">Driver:</span> Can view
                and claim incidents, manage assigned jobs
              </li>
              <li>
                <span className="font-medium text-emerald-300">Dispatcher:</span>{" "}
                Can manage all incidents and assign drivers
              </li>
            </ul>
          </div>
        </div>
      </main>

      {/* Invite Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="glass-strong border border-slate-700/50 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Invite Team Member</h2>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                  placeholder="driver@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) =>
                    setInviteRole(e.target.value as "driver" | "dispatcher")
                  }
                  className="w-full px-4 py-3 rounded-lg glass border border-slate-700/50 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50"
                >
                  <option value="driver">Driver</option>
                  <option value="dispatcher">Dispatcher</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setInviteEmail("");
                  setErrorMsg(null);
                }}
                className="flex-1 px-6 py-3 rounded-lg glass border border-slate-700/50 hover:bg-white/5 text-slate-100 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim()}
                className="flex-1 px-6 py-3 rounded-lg gradient-emerald text-white font-semibold shadow-glow hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Preview Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
