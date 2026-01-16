"use client";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Channel {
  id: string;
  channel_id: string;
  created_at: string;
}

interface KnowledgeFile {
  id: string;
  name: string;
  size: number;
  content?: string;
  created_at: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [instructions, setInstructions] = useState("");
  const [memory, setMemory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannelId, setNewChannelId] = useState("");
  const [addingChannel, setAddingChannel] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Check authentication - redirect to login if not authenticated
    const auth = localStorage.getItem("adminAuth");
    console.log("🔐 Dashboard mounted, auth status:", auth);
    
    if (auth !== "true") {
      console.log("❌ Not authenticated, redirecting to login...");
      window.location.href = "/login";
      return;
    }
    
    console.log("✅ Authenticated! Loading data...");
    loadData();
  }, [mounted]);

  async function loadData() {
    try {
      setLoading(true);
      const { data: ins } = await supabase.from("instructions").select().single();
      const { data: mem } = await supabase.from("memory").select().single();
      const { data: channelsData } = await supabase.from("allowlist").select("*");
      const { data: filesData } = await supabase.from("knowledge_files").select("*");
      
      setInstructions(ins?.content || "");
      setMemory(mem?.summary || "");
      setChannels(channelsData || []);
      setFiles(filesData || []);
      
      // Count messages in memory
      const messageCountCalc = (mem?.summary || "").split("User:").length - 1;
      setMessageCount(messageCountCalc);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveInstructions() {
    try {
      setSaving(true);
      const { data } = await supabase.from("instructions").select("id").single();
      if (data?.id) {
        await supabase.from("instructions").update({ content: instructions }).eq("id", data.id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSaving(false);
    }
  }

  async function resetMemory() {
    try {
      await supabase.from("memory").update({ summary: "" });
      setMemory("");
      setMessageCount(0);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    } catch (error) {
      console.error("Error resetting:", error);
    }
  }

  async function addChannel() {
    if (!newChannelId.trim()) return;
    try {
      setAddingChannel(true);
      const { error } = await supabase.from("allowlist").insert([
        { channel_id: newChannelId.trim() }
      ]);
      if (error) throw error;
      setNewChannelId("");
      await loadData();
    } catch (error) {
      console.error("Error adding channel:", error);
    } finally {
      setAddingChannel(false);
    }
  }

  async function removeChannel(id: string) {
    try {
      await supabase.from("allowlist").delete().eq("id", id);
      await loadData();
    } catch (error) {
      console.error("Error removing channel:", error);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fileName = `${Date.now()}-${file.name}`;
      
      console.log("📤 Uploading file:", fileName);
      
      // Upload to Supabase Storage
      const { error } = await supabase.storage
        .from("knowledge-base")
        .upload(fileName, file);

      if (error) {
        console.error("Storage error:", error);
        throw new Error(`Storage: ${error.message}`);
      }

      console.log("✅ File uploaded to storage");

      // Extract text content if it's a PDF
      let extractedContent = "";
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        try {
          console.log("📄 Extracting PDF content...");
          const formData = new FormData();
          formData.append("file", file);
          formData.append("storagePath", fileName);
          
          const response = await fetch("/api/extract-pdf", {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            extractedContent = result.content;
            console.log("✅ PDF content extracted");
          } else {
            console.log("⚠️  Could not extract PDF content");
          }
        } catch (extractError) {
          console.log("⚠️  PDF extraction skipped:", extractError);
        }
      }

      // Store file metadata with content
      const { error: insertError } = await supabase.from("knowledge_files").insert([{
        name: file.name,
        storage_path: fileName,
        size: file.size,
        content: extractedContent || null,
      }]);

      if (insertError) {
        console.error("Database error:", insertError);
        throw new Error(`Database: ${insertError.message}`);
      }

      console.log("✅ Metadata saved to database");
      await loadData();
      alert("✓ File uploaded successfully!");
    } catch (error: any) {
      console.error("Error uploading file:", error);
      alert(`❌ Failed to upload file:\n${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function logout() {
    localStorage.removeItem("adminAuth");
    window.location.href = "/login";
  }

  if (!mounted) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-xl font-bold">🤖</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Discord Copilot
                </h1>
                <p className="text-sm text-slate-400">Admin Control Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">Connected</span>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-red-400 text-sm font-semibold transition-colors"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-blue-500/30 transition-colors">
                <div className="text-blue-400 text-2xl mb-2">📊</div>
                <h3 className="font-semibold text-white mb-1">Total Messages</h3>
                <p className="text-2xl font-bold text-blue-400">{messageCount}</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-purple-500/30 transition-colors">
                <div className="text-purple-400 text-2xl mb-2">📢</div>
                <h3 className="font-semibold text-white mb-1">Allowed Channels</h3>
                <p className="text-2xl font-bold text-purple-400">{channels.length}</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-green-500/30 transition-colors">
                <div className="text-green-400 text-2xl mb-2">📚</div>
                <h3 className="font-semibold text-white mb-1">Knowledge Base</h3>
                <p className="text-2xl font-bold text-green-400">{files.length}</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-yellow-500/30 transition-colors">
                <div className="text-yellow-400 text-2xl mb-2">⚡</div>
                <h3 className="font-semibold text-white mb-1">Model</h3>
                <p className="text-sm text-yellow-400 font-semibold">Llama 3.3</p>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-yellow-500/30 transition-colors">
                <div className="text-yellow-400 text-2xl mb-2">🔒</div>
                <h3 className="font-semibold text-white mb-1">Status</h3>
                <p className="text-sm text-yellow-400 font-semibold">Active</p>
              </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* System Instructions */}
              <div className="lg:col-span-2">
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <span className="text-xl">⚙️</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">System Instructions</h2>
                      <p className="text-xs text-slate-400 mt-1">Define bot personality & behavior</p>
                    </div>
                  </div>

                  <textarea
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="Enter instructions for the bot (e.g., 'You are a helpful assistant...')"
                    className="flex-1 w-full bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all resize-none font-mono text-sm leading-relaxed"
                  />

                  <button
                    onClick={saveInstructions}
                    disabled={saving}
                    className="mt-6 w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <span>{saving ? "Saving..." : "💾 Save Instructions"}</span>
                    {saveSuccess && <span className="text-green-400">✓</span>}
                  </button>

                  {saveSuccess && (
                    <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                      <p className="text-sm text-green-400">✓ Instructions saved successfully!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Discord Channels */}
              <div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-green-500/50 transition-all duration-300 backdrop-blur-sm h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-green-500/20 rounded-lg">
                      <span className="text-xl">📢</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Allowed Channels</h2>
                      <p className="text-xs text-slate-400 mt-1">Where bot can respond</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newChannelId}
                      onChange={e => setNewChannelId(e.target.value)}
                      placeholder="Channel ID"
                      className="flex-1 bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:border-green-500 focus:outline-none text-sm"
                    />
                    <button
                      onClick={addChannel}
                      disabled={addingChannel}
                      className="bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors text-sm font-semibold"
                    >
                      {addingChannel ? "+" : "+"}
                    </button>
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto max-h-96">
                    {channels.length === 0 ? (
                      <p className="text-slate-400 text-sm text-center py-4">No channels added yet</p>
                    ) : (
                      channels.map(ch => (
                        <div key={ch.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-600 rounded-lg p-3 hover:border-slate-500 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📢</span>
                            <code className="text-xs text-slate-300">{ch.channel_id}</code>
                          </div>
                          <button
                            onClick={() => removeChannel(ch.id)}
                            className="text-red-400 hover:text-red-300 text-lg transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Memory Section */}
            <div className="mt-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <span className="text-xl">💾</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Conversation Memory</h2>
                    <p className="text-xs text-slate-400 mt-1">Bot learning and context history</p>
                  </div>
                </div>

                <textarea
                  value={memory}
                  readOnly
                  placeholder="Conversation history will appear here..."
                  className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-4 text-slate-300 placeholder-slate-500 focus:outline-none resize-none font-mono text-sm leading-relaxed cursor-default h-40"
                />

                <button
                  onClick={resetMemory}
                  className="mt-4 w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>🗑️ Clear Memory</span>
                </button>

                {resetSuccess && (
                  <div className="mt-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                    <p className="text-sm text-green-400">✓ Memory cleared successfully!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Knowledge Base / RAG Section */}
            <div className="mt-8">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-300 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <span className="text-xl">📚</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Knowledge Base (RAG)</h2>
                    <p className="text-xs text-slate-400 mt-1">Upload PDFs for bot to learn from</p>
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-purple-500/50 transition-colors">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-white font-semibold mb-1">
                      {uploading ? "Uploading..." : "Drop PDF or click to upload"}
                    </p>
                    <p className="text-sm text-slate-400">Maximum 10MB per file</p>
                  </label>
                </div>

                {files.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-white font-semibold mb-3">📁 Uploaded Files</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-600 rounded-lg p-3 hover:border-slate-500 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">📄</span>
                            <div className="flex-1">
                              <p className="text-sm text-white truncate">{file.name}</p>
                              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button
                            className="text-red-400 hover:text-red-300 transition-colors"
                            onClick={async () => {
                              try {
                                await supabase.from("knowledge_files").delete().eq("id", file.id);
                                await loadData();
                              } catch (error) {
                                console.error("Error deleting file:", error);
                              }
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/30 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold text-white mb-2">About</h3>
              <p className="text-sm text-slate-400">Discord Copilot - AI-powered team assistant</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Tech</h3>
              <p className="text-sm text-slate-400">Next.js • Supabase • Groq API</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-2">Status</h3>
              <p className="text-sm text-green-400">✓ All systems operational</p>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-8 text-center text-slate-400 text-sm">
            <p>Discord Copilot Admin Panel • Built with Next.js & Tailwind CSS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
