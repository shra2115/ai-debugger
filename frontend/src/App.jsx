import { useState } from "react";
import Editor from "@monaco-editor/react";
import axios from "axios";

const API = "http://localhost:8000/api";
const LANGUAGES = ["JavaScript","Python","Java","C++","TypeScript","Go"];

export default function App() {
  const [code, setCode] = useState("// Paste your buggy code here");
  const [language, setLanguage] = useState("JavaScript");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("bugs");
  const [execOutput, setExecOutput] = useState(null);

  const analyzeCode = async () => {
    setLoading(true);
    setResult(null);
    setExecOutput(null);
    try {
      const { data } = await axios.post(`${API}/debug`, { code, language });
      setResult(data);
      setActiveTab("bugs");
    } catch (err) {
      alert("Error: " + err.message);
    }
    setLoading(false);
  };

  const runCode = async () => {
    if (language === "Python" && result?.fixed_code) {
      const { data } = await axios.post(`${API}/execute/python`, { code: result.fixed_code });
      setExecOutput(data);
      setActiveTab("run");
    } else if (language === "JavaScript" && result?.fixed_code) {
      const logs = [];
      const orig = console.log;
      console.log = (...a) => logs.push(a.join(" "));
      try {
        // eslint-disable-next-line no-new-func
        new Function(result.fixed_code)();
        setExecOutput({ success: true, output: logs.join("\n") || "(no output)" });
      } catch (e) {
        setExecOutput({ success: false, output: e.message });
      }
      console.log = orig;
      setActiveTab("run");
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem", fontFamily: "system-ui" }}>
      <h1>🔍 AI Code Debugger</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
        <select value={language} onChange={e => setLanguage(e.target.value)}>
          {LANGUAGES.map(l => <option key={l}>{l}</option>)}
        </select>
        <button onClick={analyzeCode} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze & Fix"}
        </button>
        {result && (language === "JavaScript" || language === "Python") && (
          <button onClick={runCode}>▶ Run Fixed Code</button>
        )}
      </div>

      <Editor
        height="280px"
        language={language.toLowerCase()}
        value={code}
        onChange={v => setCode(v)}
        theme="vs-dark"
        options={{ minimap: { enabled: false }, fontSize: 14 }}
      />

      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", gap: 8, borderBottom: "1px solid #ddd", marginBottom: 16 }}>
            {["bugs","fix","explain","class","run"].map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{ padding: "6px 14px", fontWeight: activeTab === t ? 600 : 400,
                  borderBottom: activeTab === t ? "2px solid #000" : "none",
                  background: "none", border: "none", cursor: "pointer" }}>
                {t === "bugs" ? `Bugs (${result.bugs?.length || 0})`
                  : t === "fix" ? "Fixed Code" : t === "explain" ? "Explanation"
                  : t === "class" ? "Classification" : "Run Output"}
              </button>
            ))}
          </div>

          {activeTab === "bugs" && (
            <div>
              {result.bugs?.length === 0
                ? <p style={{ color: "green" }}>✅ No bugs found!</p>
                : result.bugs?.map((b, i) => (
                  <div key={i} style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, marginBottom: 8 }}>
                    <span style={{ background: b.type === "syntax" ? "#fef3c7" : b.type === "runtime" ? "#fee2e2" : "#dbeafe",
                      padding: "2px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                      {b.type?.toUpperCase()}
                    </span>
                    {b.line && <span style={{ marginLeft: 8, color: "#666", fontSize: 12 }}>Line {b.line}</span>}
                    <p style={{ marginTop: 6 }}>{b.description}</p>
                  </div>
                ))}
            </div>
          )}

          {activeTab === "fix" && (
            <pre style={{ background: "#1e1e1e", color: "#d4d4d4", padding: 16, borderRadius: 8, overflowX: "auto" }}>
              {result.fixed_code}
            </pre>
          )}

          {activeTab === "explain" && <p style={{ lineHeight: 1.8 }}>{result.explanation}</p>}

          {activeTab === "class" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Error Type", result.error_classification], ["Severity", result.severity],
                ["Bugs Found", result.bugs?.length], ["Language", language]].map(([k, v]) => (
                <div key={k} style={{ padding: 14, border: "1px solid #eee", borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: "#888" }}>{k}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, marginTop: 4 }}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "run" && execOutput && (
            <pre style={{ background: execOutput.success ? "#f0fdf4" : "#fef2f2",
              color: execOutput.success ? "#166534" : "#991b1b",
              padding: 16, borderRadius: 8 }}>
              {execOutput.output}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
